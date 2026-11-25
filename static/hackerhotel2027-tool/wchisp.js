// WCH USB ISP client for the CH643 boot ROM (bootloader V2.60, USB 1a86:55e0),
// over WebUSB: the web interface's firmware update (firmware_update.js).
// The same protocol as minichlink's `flash -b`; docs/FIRMWARE_UPDATE.md
// describes it. Sources for each rule are in the comments:
//   MCL    = ch32fun/minichlink/pgm-wch-isp.c
//   WCHISP = github.com/ch32-rs/wchisp @ f51b1ce, src/
//   ROM    = disassembly of the badge's boot ROM, byte offsets
//
// Plain script like the other webui files: it defines WchIsp, WchIspError and
// WCHISP as globals. In node, require() returns the same three names.
//
// The item store (0x7800 and up) must survive a firmware update. This client
// refuses to erase or program at or above `limit` (default 0x7800), and the
// boot ROM's ERASE always starts at address 0, so the store is never touched.
'use strict';

const WCHISP = Object.freeze({
	VENDOR_IDS: Object.freeze([0x1a86, 0x4348]), // the badge's ROM enumerates as 1a86; MCL:50 accepts both
	PRODUCT_ID: 0x55e0,
	CONFIGURATION: 1, // WCHISP transport/usb.rs:133
	INTERFACE: 0, // MCL:66
	ENDPOINT: 2, // bulk OUT 0x02 and bulk IN 0x82 (MCL:18-19); WebUSB takes the number only
	PACKET: 64, // wMaxPacketSize of both endpoints (ROM config descriptor at 0xca4)
	CHUNK: 56, // data bytes per PROGRAM/VERIFY packet: 8-byte header + 56 = 64 (MCL:337)
	PAGE: 256, // the ROM programs whole 256-byte pages only (ROM 0x27a-0x32c)
	SECTOR: 1024, // ERASE unit (ROM 0x3b0-0x3c8)
	MIN_ERASE_SECTORS: 8, // the ROM clamps to 8..62 (ROM 0x39c-0x3ac); MCL:318
	FLASH_SIZE: 62 * 1024,
	STORE_START: 0x7800, // item store (README "Flash 30 .. 61 KB | items"); sector 30
	DEVICE_TYPE: 0x24, // CH643 family (WCHISP devices/0x24-CH643.yaml:5; ROM 0x228-0x240)
	ID_STRING: 'MCU ISP & WCH.CN', // the only part of IDENTIFY the ROM checks (ROM 0x204-0x21e)
	CMD: Object.freeze({
		IDENTIFY: 0xa1, ISP_END: 0xa2, ISP_KEY: 0xa3, ERASE: 0xa4,
		PROGRAM: 0xa5, VERIFY: 0xa6, READ_CONFIG: 0xa7,
		// WRITE_CONFIG (0xa8) is deliberately not implemented: clearing read
		// protection erases the whole flash, items included (CH643RM 20.5).
	}),
	STATUS: Object.freeze({ OK: 0x00, BAD_ID_STRING: 0xf1, VERIFY_MISMATCH: 0xf5, ERROR: 0xfe }),
});

class WchIspError extends Error {
	// code: short machine-readable reason, docs/FIRMWARE_UPDATE.md lists them
	constructor(message, code, details = {}) {
		super(message);
		this.name = 'WchIspError';
		this.code = code;
		Object.assign(this, details);
	}
}

const hex = (n, w = 2) => '0x' + n.toString(16).padStart(w, '0');
const sum8 = (bytes) => bytes.reduce((a, b) => (a + b) & 0xff, 0);

function toBytes(data, what) {
	if (data instanceof Uint8Array) return data;
	if (data instanceof ArrayBuffer) return new Uint8Array(data);
	if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
	if (Array.isArray(data)) return Uint8Array.from(data);
	throw new WchIspError(`${what} must be bytes (Uint8Array or ArrayBuffer)`, 'bad-argument');
}

// Resolve with `promise`, or reject after `ms`. The losing promise keeps
// running: WebUSB transfers cannot be cancelled except by closing the device.
function withTimeout(promise, ms, onTimeout) {
	let timer;
	const timeout = new Promise((_, reject) => {
		timer = setTimeout(() => reject(onTimeout()), ms);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

class WchIsp {
	// Filters for navigator.usb.requestDevice()
	static get filters() {
		return WCHISP.VENDOR_IDS.map((vendorId) => ({ vendorId, productId: WCHISP.PRODUCT_ID }));
	}

	static matches(device) {
		return WCHISP.VENDOR_IDS.includes(device.vendorId) && device.productId === WCHISP.PRODUCT_ID;
	}

	// The ROM's key: ROM 0x3d2-0x47a. seed: >= 30 bytes; uidSum: sum of the 8
	// UID bytes mod 256; chipId: IDENTIFY reply byte 4. With the all-zero seed
	// this is [s,s,s,s,s,s,s,s+chipId], as MCL:218-225 and WCHISP flashing.rs:545-554.
	static deriveKey(seed, uidSum, chipId) {
		const L = seed.length, n = Math.floor(L / 7), m = Math.floor(L / 5);
		const k = new Uint8Array(8);
		k[0] = uidSum ^ seed[4 * n];
		k[1] = uidSum ^ seed[m];
		k[2] = uidSum ^ seed[n];
		k[3] = uidSum ^ seed[6 * n];
		k[4] = uidSum ^ seed[3 * n];
		k[5] = uidSum ^ seed[3 * m];
		k[6] = uidSum ^ seed[5 * n];
		k[7] = (k[0] + chipId) & 0xff;
		return k;
	}

	// Throws unless `image` can be written below `limit`. Returns the plan:
	// the image padded with 0xFF to whole pages, the sectors to erase, and
	// the data packets in the order to send them (pages 1..P-1, then page 0;
	// each page as 56+56+56+56+32 bytes so every page is complete before the
	// next one starts: the ROM programs the page of the packet that fills its
	// 256-byte buffer, ROM 0x2a4-0x2d4).
	static plan(image, limit = WCHISP.STORE_START) {
		const bytes = toBytes(image, 'image');
		if (bytes.length === 0) throw new WchIspError('The firmware image is empty.', 'bad-image');
		if (bytes.length > limit)
			throw new WchIspError(`The firmware image is ${bytes.length} bytes; at most ${limit} fit below the item store.`, 'image-too-large');
		const first = bytes.length >= 4 ? new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true) : 0;
		if (bytes.length >= 4 && first === 0xffffffff)
			throw new WchIspError('The image starts with 0xFFFFFFFF: the boot ROM would treat the badge as empty and never start it.', 'bad-image');
		const pages = Math.ceil(bytes.length / WCHISP.PAGE);
		const padded = new Uint8Array(pages * WCHISP.PAGE).fill(0xff);
		padded.set(bytes);
		const sectors = Math.max(WCHISP.MIN_ERASE_SECTORS, Math.ceil(padded.length / WCHISP.SECTOR));
		if (sectors * WCHISP.SECTOR > limit)
			throw new WchIspError(`Erasing ${sectors} sectors would reach the item store.`, 'image-too-large');
		const order = [];
		for (let p = 1; p < pages; p++) order.push(p);
		order.push(0);
		const packets = [];
		for (const page of order) {
			for (let off = 0; off < WCHISP.PAGE; off += WCHISP.CHUNK) {
				const address = page * WCHISP.PAGE + off;
				const n = Math.min(WCHISP.CHUNK, WCHISP.PAGE - off);
				packets.push({ page, address, data: padded.subarray(address, address + n) });
			}
		}
		return { image: bytes, padded, pages, sectors, packets };
	}

	// device: a WebUSB USBDevice for the boot ROM (from requestDevice with
	// WchIsp.filters, or getDevices()). Options:
	//   timeoutMs       per transfer (default 5000, as MCL:20 and WCHISP usb.rs:14)
	//   eraseTimeoutMs  for the ERASE reply (default 10000; not measured)
	//   drainFirst      drop stale replies on the first open (use when a
	//                   previous client on this device failed; default false)
	//   drainMs         quiet time that ends a drain after a failure (default 200)
	//   limit           first byte this client may not erase or program (default 0x7800)
	//   log(dir, bytes) optional packet trace, dir 'out' or 'in'
	constructor(device, options = {}) {
		this.device = device;
		this.timeoutMs = options.timeoutMs ?? 5000;
		this.eraseTimeoutMs = options.eraseTimeoutMs ?? 10000;
		this.drainMs = options.drainMs ?? 200;
		this.limit = options.limit ?? WCHISP.STORE_START;
		if (this.limit > WCHISP.STORE_START || this.limit % WCHISP.SECTOR)
			throw new WchIspError('limit must be a multiple of 1024 and at most 0x7800 (the item store).', 'bad-argument');
		this.log = options.log ?? null;
		this.chipId = null;
		this.deviceType = null;
		this.config = null;
		this.key = null;
		this._dead = null; // reason the session can no longer be used
		this._claimed = false;
		this._needDrain = !!options.drainFirst;
		this._closing = null;
		this._queue = Promise.resolve();
	}

	// ---- connection -------------------------------------------------------

	// Opens and claims the interface. After a timeout or an out-of-step reply,
	// it first drops any reply the ROM still holds (see _drain).
	async open() {
		await this._closing;
		await this._openRaw();
		if (this._needDrain) {
			await this._drain();
			this._needDrain = false;
		}
		this._dead = null;
	}

	async _openRaw() {
		const d = this.device;
		if (!WchIsp.matches(d))
			throw new WchIspError(`This is not the WCH boot ROM (USB ${hex(d.vendorId, 4)}:${hex(d.productId, 4)}).`, 'wrong-device');
		try {
			if (!d.opened) await d.open();
			if (!d.configuration || d.configuration.configurationValue !== WCHISP.CONFIGURATION)
				await d.selectConfiguration(WCHISP.CONFIGURATION);
			// No selectAlternateInterface: the ROM has only alt 0 and STALLs SET_INTERFACE.
			await d.claimInterface(WCHISP.INTERFACE);
		} catch (e) {
			throw new WchIspError(`Cannot open the boot ROM: ${e.message}`, 'open-failed', { cause: e });
		}
		const alt = d.configuration?.interfaces?.find((i) => i.interfaceNumber === WCHISP.INTERFACE)?.alternate;
		const eps = alt?.endpoints ?? [];
		const has = (dir) => eps.some((e) => e.endpointNumber === WCHISP.ENDPOINT && e.direction === dir && e.type === 'bulk');
		if (alt && !(has('in') && has('out')))
			throw new WchIspError('The boot ROM interface has no bulk endpoint 2 in both directions.', 'wrong-device');
		this._claimed = true;
	}

	// A reply that came too late is still waiting in the ROM's IN endpoint,
	// and would be taken as the reply to the next command. Read and drop
	// replies until a read gets nothing for `ms`; that last read can only be
	// cancelled by closing the device, so reopen after it.
	async _drain(ms = this.drainMs) {
		for (let i = 0; i < 4; i++) {
			let res;
			try {
				res = await withTimeout(this.device.transferIn(WCHISP.ENDPOINT, WCHISP.PACKET), ms, () => new WchIspError('drained', 'timeout'));
			} catch (e) {
				if (e.code !== 'timeout') throw this._transferError(e, 0, 'in');
				await this.close();
				await this._openRaw();
				return;
			}
			if (res.data) this.log?.('in-dropped', new Uint8Array(res.data.buffer, res.data.byteOffset, res.data.byteLength).slice());
		}
		throw new WchIspError('The boot ROM keeps sending data. Unplug the badge and start again.', 'bad-reply');
	}

	// Best effort; never throws. Also cancels a transfer still waiting.
	async close() {
		this._claimed = false;
		try { if (this.device.opened) await this.device.releaseInterface(WCHISP.INTERFACE); } catch (e) { /* gone */ }
		try { if (this.device.opened) await this.device.close(); } catch (e) { /* gone */ }
	}

	// ---- transport --------------------------------------------------------

	// One command = one OUT packet and one IN reply (docs/FIRMWARE_UPDATE.md).
	// Calls are queued so two commands never overlap.
	_serial(fn) {
		const run = this._queue.then(fn, fn);
		this._queue = run.catch(() => {});
		return run;
	}

	_kill(reason) {
		if (!this._dead) this._dead = reason;
		if (reason === 'timeout' || reason === 'bad-reply') this._needDrain = true;
		// Closing the device is the only way to cancel a pending WebUSB
		// transfer. Without it, a late reply would answer the next command.
		this._closing = this.close();
	}

	_transferError(e, cmd, dir) {
		const name = e?.name;
		if (e instanceof WchIspError) return e;
		const where = `${dir === 'out' ? 'sending' : 'waiting for the reply to'} command ${hex(cmd)}`;
		if (name === 'NotFoundError' || name === 'NetworkError' || name === 'InvalidStateError')
			return new WchIspError(`The boot ROM disconnected while ${where}.`, 'disconnected', { cmd, cause: e });
		return new WchIspError(`USB error while ${where}: ${e?.message ?? e}`, 'usb-error', { cmd, cause: e });
	}

	async _transact(pkt, timeoutMs) {
		const cmd = pkt[0];
		if (this._dead)
			throw new WchIspError(`The boot ROM session cannot be used any more (${this._dead}). Reconnect and start again.`, 'session-dead', { cmd });
		if (pkt.length > WCHISP.PACKET) throw new WchIspError(`Packet of ${pkt.length} bytes is too long.`, 'bad-argument', { cmd });
		this.log?.('out', pkt);
		let res;
		try {
			res = await withTimeout(this.device.transferOut(WCHISP.ENDPOINT, pkt), timeoutMs, () =>
				new WchIspError(`The boot ROM did not take command ${hex(cmd)} within ${timeoutMs} ms.`, 'timeout', { cmd }));
		} catch (e) {
			const err = this._transferError(e, cmd, 'out');
			this._kill(err.code);
			throw err;
		}
		if (res.status !== 'ok' || res.bytesWritten !== pkt.length) {
			this._kill('send-failed');
			throw new WchIspError(`Sending command ${hex(cmd)} failed (${res.status}, ${res.bytesWritten} of ${pkt.length} bytes).`, 'usb-error', { cmd });
		}
		try {
			res = await withTimeout(this.device.transferIn(WCHISP.ENDPOINT, WCHISP.PACKET), timeoutMs, () =>
				new WchIspError(`No reply to command ${hex(cmd)} within ${timeoutMs} ms.`, 'timeout', { cmd }));
		} catch (e) {
			const err = this._transferError(e, cmd, 'in');
			this._kill(err.code);
			throw err;
		}
		if (res.status !== 'ok' || !res.data) {
			this._kill('receive-failed');
			throw new WchIspError(`Reading the reply to command ${hex(cmd)} failed (${res.status}).`, 'usb-error', { cmd });
		}
		const reply = new Uint8Array(res.data.buffer, res.data.byteOffset, res.data.byteLength).slice();
		this.log?.('in', reply);
		return reply;
	}

	// Send cmd + payload; check and return the reply [cmd, 00, len16, status, ...]
	// (ROM 0x252-0x276). replyLen is 6 for every command but READ_CONFIG (30).
	_command(cmd, payload, { timeoutMs = this.timeoutMs, replyLen = 6 } = {}) {
		return this._serial(async () => {
			const pkt = new Uint8Array(3 + payload.length);
			pkt[0] = cmd;
			pkt[1] = payload.length & 0xff;
			pkt[2] = (payload.length >> 8) & 0xff;
			pkt.set(payload, 3);
			const r = await this._transact(pkt, timeoutMs);
			const bad = (why) => {
				// The reply stream may be out of step with the commands: stop.
				this._kill('bad-reply');
				return new WchIspError(`Unexpected reply to command ${hex(cmd)}: ${why}.`, 'bad-reply', { cmd, reply: r });
			};
			if (r.length < 6) throw bad(`only ${r.length} bytes`);
			if (r[0] !== cmd) throw bad(`it answers command ${hex(r[0])}`); // as WCHISP transport/mod.rs:423
			if ((r[2] | (r[3] << 8)) !== r.length - 4) throw bad('length field does not match');
			if (r.length !== replyLen) throw bad(`${r.length} bytes, expected ${replyLen}`);
			return r;
		});
	}

	// ---- commands ---------------------------------------------------------

	// 0xa1. The ROM ignores bytes 3-4 (ROM 0x204); the default is what
	// minichlink sends (MCL:121), the bytes proven on this badge.
	async identify(deviceId = 0x52, deviceType = 0x11) {
		const payload = new Uint8Array(18);
		payload[0] = deviceId;
		payload[1] = deviceType;
		payload.set(new TextEncoder().encode(WCHISP.ID_STRING), 2);
		const r = await this._command(WCHISP.CMD.IDENTIFY, payload);
		const chipId = r[4], type = r[5];
		if (type === 0 && chipId === WCHISP.STATUS.BAD_ID_STRING)
			throw new WchIspError('The boot ROM rejected the identify string.', 'identify-rejected');
		if (type !== WCHISP.DEVICE_TYPE)
			throw new WchIspError(`This boot ROM is not a CH643 (device type ${hex(type)}, chip ${hex(chipId)}).`, 'wrong-chip', { chipId, deviceType: type });
		// minichlink accepts chip ids 0x00-0x3f for type 0x24 (isp_id_mask 0x243f, chips.c:725, :805).
		if (chipId > 0x3f)
			throw new WchIspError(`Unknown CH643 chip id ${hex(chipId)}.`, 'wrong-chip', { chipId, deviceType: type });
		this.chipId = chipId;
		this.deviceType = type;
		return { chipId, deviceType: type };
	}

	// 0xa7. Also makes the ROM compute the UID sum it uses for the key
	// (ROM 0x576-0x5a6): call it before setKey(). Layout: docs/FIRMWARE_UPDATE.md.
	async readConfig() {
		const r = await this._command(WCHISP.CMD.READ_CONFIG, Uint8Array.of(0x1f, 0x00), { replyLen: 30 });
		const uid = r.slice(22, 30);
		this.config = {
			rdpr: r[6], nrdpr: r[7], user: r[8], nuser: r[9],
			data0: r[10], ndata0: r[11], data1: r[12], ndata1: r[13],
			wrpr: r.slice(14, 18),
			readProtected: r[6] !== 0xa5, // MCL:203; CH643RM 20.5 RDPR
			bootloaderVersion: `${r[19]}.${r[20]}${r[21]}`, // MCL:204, "2.60" on the badge
			uid,
			uidHex: Array.from(uid, (b) => b.toString(16).padStart(2, '0')).join('-'),
			uidSum: sum8(uid),
		};
		return this.config;
	}

	// 0xa3. The default all-zero 30-byte seed is what minichlink (MCL:233) and
	// wchisp (flashing.rs:212) send. Other seeds follow the ROM's schedule
	// but have not been tried on hardware.
	async setKey(seed = new Uint8Array(30)) {
		seed = toBytes(seed, 'seed');
		if (seed.length < 30 || seed.length > WCHISP.PACKET - 3)
			throw new WchIspError('The key seed must be 30 to 61 bytes.', 'bad-argument'); // ROM 0x3d2: < 30 is refused
		if (this.chipId === null || !this.config)
			throw new WchIspError('Call identify() and readConfig() before setKey().', 'bad-sequence');
		const key = WchIsp.deriveKey(seed, this.config.uidSum, this.chipId);
		const r = await this._command(WCHISP.CMD.ISP_KEY, seed);
		if (r[4] !== sum8(key)) // MCL:234, WCHISP flashing.rs:216
			throw new WchIspError(`The boot ROM computed a different key (checksum ${hex(r[4])}, expected ${hex(sum8(key))}).`, 'key-mismatch');
		this.key = key;
		return key;
	}

	// 0xa4. Erases `sectors` 1 KiB sectors from address 0 (the ROM has no
	// start address, ROM 0x3b0). The ROM reads only byte 3 (ROM 0x39c).
	async erase(sectors) {
		if (!Number.isInteger(sectors) || sectors < WCHISP.MIN_ERASE_SECTORS || sectors * WCHISP.SECTOR > this.limit)
			throw new WchIspError(`Erase ${WCHISP.MIN_ERASE_SECTORS} to ${this.limit / WCHISP.SECTOR} sectors only, not ${sectors}.`, 'bad-argument');
		const r = await this._command(WCHISP.CMD.ERASE, Uint8Array.of(sectors, 0, 0, 0), { timeoutMs: this.eraseTimeoutMs });
		if (r[4] !== WCHISP.STATUS.OK) throw new WchIspError(`Erase failed (status ${hex(r[4])}).`, 'erase-failed', { status: r[4] });
	}

	_dataPayload(address, data, pad) {
		if (!this.key) throw new WchIspError('Call setKey() first.', 'bad-sequence');
		data = toBytes(data, 'data');
		if (data.length > WCHISP.CHUNK) throw new WchIspError(`At most ${WCHISP.CHUNK} bytes per packet.`, 'bad-argument');
		if (!Number.isInteger(address) || address < 0 || address + Math.max(1, data.length) > this.limit)
			throw new WchIspError(`Address ${hex(address, 8)} + ${data.length} is outside 0..${hex(this.limit, 4)}.`, 'bad-argument');
		const p = new Uint8Array(5 + data.length);
		new DataView(p.buffer).setUint32(0, address, true);
		p[4] = pad & 0xff; // ignored by the ROM (ROM 0x27a ff.)
		for (let i = 0; i < data.length; i++) p[5 + i] = data[i] ^ this.key[i & 7]; // key index restarts per packet (ROM 0x2da)
		return p;
	}

	// 0xa5, one packet. Low level: the ROM programs a page only when 256
	// bytes have arrived, at the page of the packet that completes it, and a
	// packet under 56 bytes that does not complete a page flushes the buffer
	// padded with 0xFF (ROM 0x27a-0x32c). Send each page complete before the
	// next. The status is always 0 (ROM 0x2d6): only verify() proves a write.
	async programChunk(address, data, { pad = 0 } = {}) {
		const r = await this._command(WCHISP.CMD.PROGRAM, this._dataPayload(address, data, pad));
		if (r[4] !== WCHISP.STATUS.OK)
			throw new WchIspError(`Program at ${hex(address, 4)} failed (status ${hex(r[4])}).`, 'program-failed', { address, status: r[4] });
	}

	// An empty PROGRAM: programs a half-filled page buffer left by an earlier
	// aborted attempt in the same boot ROM session, and resets its count.
	// Send it before erase(): any page it writes is then erased.
	flushPageBuffer() {
		return this.programChunk(0, new Uint8Array(0));
	}

	// 0xa6, one packet. Address and length must be multiples of 8 (ROM 0x32e).
	// After a mismatch the ROM answers 0xfe to every VERIFY until the next
	// erase (ROM 0x33c, 0x3cc).
	async verifyChunk(address, data, { pad = 0 } = {}) {
		data = toBytes(data, 'data');
		if (address % 8 || data.length % 8)
			throw new WchIspError('Verify address and length must be multiples of 8.', 'bad-argument');
		const r = await this._command(WCHISP.CMD.VERIFY, this._dataPayload(address, data, pad));
		if (r[4] === WCHISP.STATUS.VERIFY_MISMATCH)
			throw new WchIspError(`The flash differs from the image at ${hex(address, 4)}..${hex(address + data.length - 1, 4)}.`, 'verify-mismatch', { address });
		if (r[4] !== WCHISP.STATUS.OK)
			throw new WchIspError(`Verify at ${hex(address, 4)} refused (status ${hex(r[4])}; an earlier verify failed since the erase).`, 'verify-refused', { address, status: r[4] });
	}

	// 0xa2. reason 1: clear BOOT_MODE and reset into the application
	// (ROM 0x726-0x74a; MCL:407). The device leaves the bus right after the
	// reply; a lost reply is not an error (as WCHISP main.rs:267-268).
	async end(reason = 1) {
		let replied = true;
		try {
			const r = await this._command(WCHISP.CMD.ISP_END, Uint8Array.of(reason));
			if (r[4] !== WCHISP.STATUS.OK) throw new WchIspError(`ISP end refused (status ${hex(r[4])}).`, 'end-failed', { status: r[4] });
		} catch (e) {
			if (e.code !== 'disconnected' && e.code !== 'timeout' && e.code !== 'usb-error') throw e;
			replied = false;
		}
		this._dead = 'ended';
		await this.close();
		return { replied };
	}

	// ---- the whole update -------------------------------------------------

	// Writes a firmware image and keeps the item store. Order:
	//   identify, read config, key, flush, erase,
	//   pages 1..P-1, verify them, page 0, verify it, ISP end.
	// Page 0 goes last: from the erase until the last page is in and
	// verified, the first flash word is 0xFFFFFFFF, so after any failure the
	// boot ROM comes back at power-on (it starts when the first word is erased) and the update can be
	// run again. Options:
	//   onProgress({phase, done, total, percent})
	//   signal   AbortSignal, checked between packets
	//   seed     key seed (default 30 zero bytes)
	//   verify   default true
	//   reset    send ISP end at the end (default true)
	// Errors are WchIspError with .phase and .bootPageWritten set.
	async flashFirmware(image, { onProgress = null, signal = null, seed, verify = true, reset = true } = {}) {
		const plan = WchIsp.plan(image, this.limit);
		const later = plan.packets.filter((p) => p.page !== 0);
		const boot = plan.packets.filter((p) => p.page === 0);
		const total = plan.packets.length * (verify ? 2 : 1) + 1;
		let done = 0, phase = 'connect', bootPageWritten = false;
		const progress = (step = 0) => {
			done += step;
			onProgress?.({ phase, done, total, percent: Math.floor((100 * done) / total) });
		};
		const check = () => {
			if (signal?.aborted) throw new WchIspError('The update was cancelled.', 'aborted');
		};
		try {
			if (!this._claimed || this._dead) await this.open();
			phase = 'identify'; progress(); check();
			const id = await this.identify();
			const cfg = await this.readConfig();
			if (cfg.readProtected)
				throw new WchIspError('The chip is read-protected. This updater does not remove read protection, because that erases the whole flash and the stored items.', 'read-protected');
			await this.setKey(seed);
			check();
			await this.flushPageBuffer();
			phase = 'erase'; progress(); check();
			await this.erase(plan.sectors);
			progress(1);
			phase = 'write';
			for (const p of later) { check(); await this.programChunk(p.address, p.data); progress(1); }
			if (verify) {
				phase = 'verify';
				for (const p of later) { check(); await this.verifyChunk(p.address, p.data); progress(1); }
			}
			phase = 'write-boot-page';
			check();
			bootPageWritten = true; // from the first packet of page 0 on, assume the worst
			for (const p of boot) { await this.programChunk(p.address, p.data); progress(1); }
			if (verify) {
				phase = 'verify-boot-page';
				for (const p of boot) { await this.verifyChunk(p.address, p.data); progress(1); }
			}
			const info = {
				chipId: id.chipId, uid: cfg.uidHex, bootloaderVersion: cfg.bootloaderVersion,
				bytes: plan.image.length, pages: plan.pages, sectors: plan.sectors, verified: verify,
			};
			if (reset) {
				phase = 'reset'; progress();
				info.resetReplied = (await this.end(1)).replied;
			}
			phase = 'done'; progress();
			return info;
		} catch (e) {
			const err = e instanceof WchIspError ? e : new WchIspError(e?.message ?? String(e), 'internal', { cause: e });
			err.phase = phase;
			err.bootPageWritten = bootPageWritten;
			throw err;
		}
	}
}

if (typeof module === 'object' && module.exports) module.exports = { WchIsp, WchIspError, WCHISP };
