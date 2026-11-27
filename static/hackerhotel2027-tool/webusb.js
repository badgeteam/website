// WebUSB transport for the LED matrix protocol. See the firmware's
// webusb_protocol.h -- this file and webusb_protocol.c must agree.
'use strict';

const USB_VENDOR_ID = 0x1209;
const USB_PRODUCT_ID = 0xd643;
const EP_OUT = 2;
const EP_IN = 1;

const CMD = {
	SET_PIXEL: 0x01,
	FRAME_CHUNK: 0x02,
	FRAME_COMMIT: 0x03,
	CLEAR: 0x05,
	PATTERN_BEGIN: 0x10,
	PATTERN_CHUNK: 0x11,
	PATTERN_COMMIT: 0x12,
	STORE_ERASE: 0x20,
	ITEM_BEGIN: 0x21,
	ITEM_CHUNK: 0x22,
	ITEM_COMMIT: 0x23,
	ITEM_INFO: 0x24,
	ITEM_RUN: 0x25,
	STOP: 0x26,
	ITEM_DELETE: 0x27,
	NAME_GET: 0x30,
	NAME_SET: 0x31,
	BOOT_ROM: 0x40,
	FW_INFO: 0x41,
	QUERY: 0xff,
};

// Item types in the store (STORE_TYPE_* in store.h)
const ITEM_TYPE = { ANIMATION: 1, APP: 2, TEXT: 3 };
const ITEM_TYPE_NAMES = { 1: 'Animation', 2: 'App', 3: 'Text' };
const NO_ITEM = 0xff;

// The firmware's app API version (HH_API_VERSION in apps/hhapp.h) that this
// web interface was made with. A badge with an older one lacks commands or
// modes the page uses: the page asks for a firmware update.
const FIRMWARE_API = 7;

// The status reply's result byte (STORE_ERR_* in store.h)
const STORE_ERRORS = {
	1: 'bad command or index',
	2: 'not enough room left on the badge -- erase the store first',
	3: 'no such item',
	4: 'not a valid animation, app or text',
};

class StoreError extends Error {
	constructor(message, result) {
		super(message);
		this.result = result; // STORE_ERR_*, or undefined: no reply
	}
}

class LedMatrixDevice extends EventTarget {
	constructor() {
		super();
		this.device = null;
		// All sends go through this chain so transferOut/transferIn calls
		// on the same endpoints never overlap.
		this._queue = Promise.resolve();
	}

	get connected() {
		return !!this.device;
	}

	get emulator() {
		return !!this.device?.emulator;
	}

	// The badge's USB serial number: 16 hex digits from the chip's unique ID
	// ("001" on older firmware). Empty for the emulator.
	get serialNumber() {
		return (this.device?.serialNumber || '').replace(/\0+$/, '');
	}

	// The emulator (tools/emu/emu.py --web) serves this page and takes the
	// packets on POST /usb instead of over WebUSB. True if it is there.
	static async emulatorPresent() {
		// the emulator serves the page on this PC; a public site has none
		if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return false;
		try {
			return (await fetch('emu', { cache: 'no-store' })).ok;
		} catch (e) {
			return false;
		}
	}

	async connectEmulator() {
		if (!(await LedMatrixDevice.emulatorPresent())) throw new Error('no emulator serves this page');
		this.device = { emulator: true };
		this.dispatchEvent(new CustomEvent('connect'));
	}

	async requestAndOpen() {
		const device = await navigator.usb.requestDevice({
			filters: [{ vendorId: USB_VENDOR_ID, productId: USB_PRODUCT_ID }],
		});
		await this._open(device);
	}

	// Reattaches to a device the browser already remembers permission for
	// (navigator.usb.getDevices()), without a chooser prompt. Used on page
	// load so a refresh doesn't force reconnecting by hand.
	async tryAutoReconnect() {
		const devices = await navigator.usb.getDevices();
		const match = devices.find(
			(d) => d.vendorId === USB_VENDOR_ID && d.productId === USB_PRODUCT_ID
		);
		if (match) await this._open(match);
	}

	async _open(device) {
		await device.open();
		if (device.configuration === null) await device.selectConfiguration(1);
		await device.claimInterface(0);
		this.device = device;
		// USBDevice doesn't implement EventTarget -- 'disconnect' is fired on
		// navigator.usb itself, with event.device identifying which device.
		navigator.usb.addEventListener('disconnect', this._onUsbDisconnect);
		this.dispatchEvent(new CustomEvent('connect'));
	}

	_onUsbDisconnect = (ev) => {
		if (ev.device !== this.device) return;
		navigator.usb.removeEventListener('disconnect', this._onUsbDisconnect);
		this.device = null;
		this.dispatchEvent(new CustomEvent('disconnect'));
	};

	async disconnect() {
		if (!this.device) return;
		if (this.emulator) {
			this.device = null;
			this.dispatchEvent(new CustomEvent('disconnect'));
			return;
		}
		try {
			await this.device.close();
		} catch (e) {
			/* already gone */
		}
		this.device = null;
		this.dispatchEvent(new CustomEvent('disconnect'));
	}

	// Sends one command packet and returns the status reply (see
	// webusb_protocol.h) as {mode, brightness, result, count, running,
	// boot, freeBytes, api, item}, or null if nothing is connected.
	_send(bytes) {
		this._queue = this._queue.then(() => this._sendNow(bytes)).catch((e) => {
			console.error('LED matrix USB error', e);
			this.dispatchEvent(new CustomEvent('error', { detail: e }));
		});
		return this._queue;
	}

	async _sendNow(bytes) {
		if (!this.device) return null;
		let d;
		if (this.emulator) {
			const r = await fetch('usb', { method: 'POST', body: new Uint8Array(bytes) });
			if (r.status === 503) {
				// USB unplugged in the emulator (V): a disconnect, as WebUSB
				// reports when a badge is unplugged
				this.device = null;
				this.dispatchEvent(new CustomEvent('disconnect'));
				return null;
			}
			if (!r.ok) throw new Error(`emulator: ${r.status} ${r.statusText}`);
			d = new DataView(await r.arrayBuffer());
		} else {
			await this.device.transferOut(EP_OUT, new Uint8Array(bytes));
			d = (await this.device.transferIn(EP_IN, 64)).data;
		}
		if (d && d.byteLength >= 2) {
			const status = { mode: d.getUint8(0), brightness: d.getUint8(1) };
			if (d.byteLength >= 8) {
				Object.assign(status, {
					result: d.getUint8(2),
					count: d.getUint8(3),
					running: d.getUint8(4),
					boot: d.getUint8(5),
					freeBytes: d.getUint8(6) * 256,
					api: d.getUint8(7),
				});
			}
			if (d.byteLength === 56) {
				const info = new Uint8Array(d.buffer, d.byteOffset + 8, 48);
				const end = info.indexOf(0);
				status.firmware = new TextDecoder().decode(end < 0 ? info : info.subarray(0, end));
			} else if (d.byteLength === 40) {
				const name = new Uint8Array(d.buffer, d.byteOffset + 8, 32);
				const end = name.indexOf(0);
				status.name = new TextDecoder().decode(end < 0 ? name : name.subarray(0, end));
			} else if (d.byteLength >= 33 && status.result === 0) {
				const name = new Uint8Array(d.buffer, d.byteOffset + 13, 20);
				const end = name.indexOf(0);
				status.item = {
					type: d.getUint8(8),
					length: d.getUint32(9, true),
					name: new TextDecoder().decode(end < 0 ? name : name.subarray(0, end)),
				};
			}
			this.dispatchEvent(new CustomEvent('status', { detail: status }));
			return status;
		}
		return null;
	}

	setPixel(row, col, brightness) {
		return this._send([CMD.SET_PIXEL, row, col, brightness]);
	}

	// frame: Uint8Array(384), row-major (index = row * 24 + col).
	// All packets go into the queue at once, so no other command (a Run, a
	// Stop) can come between the chunks and the commit.
	uploadFrame(frame) {
		const CHUNK = 58;
		for (let offset = 0; offset < frame.length; offset += CHUNK) {
			const slice = frame.subarray(offset, Math.min(offset + CHUNK, frame.length));
			this._send([CMD.FRAME_CHUNK, offset & 0xff, (offset >> 8) & 0xff, ...slice]);
		}
		return this._send([CMD.FRAME_COMMIT]);
	}

	clear() {
		return this._send([CMD.CLEAR]);
	}

	query() {
		return this._send([CMD.QUERY]);
	}

	// Throws a StoreError if the reply reports one.
	async _checked(bytes, what) {
		const status = await this._send(bytes);
		if (!status) throw new StoreError(`${what}: no reply from the badge`);
		if (status.result) throw new StoreError(`${what}: ${STORE_ERRORS[status.result] ?? status.result}`, status.result);
		return status;
	}

	// Adds an item to the badge's store (store.h): type ITEM_TYPE.*, bytes
	// a .ledanim, a .hhapp or a text item (text_item.js). The badge starts it at once, and from then on
	// at every boot. ITEM_BEGIN erases the free space before it replies,
	// which takes a moment. onProgress(sent, total) follows the upload.
	async storeItem(type, name, bytes, onProgress) {
		const nameBytes = new TextEncoder().encode(name).subarray(0, 20);
		await this._checked([CMD.ITEM_BEGIN, type, ...nameBytes], 'Starting the upload');
		const CHUNK = 60;
		for (let offset = 0; offset < bytes.length; offset += CHUNK) {
			const slice = bytes.subarray(offset, Math.min(offset + CHUNK, bytes.length));
			await this._checked([CMD.ITEM_CHUNK, ...slice], 'Uploading');
			if (onProgress) onProgress(offset + slice.length, bytes.length);
		}
		return this._checked([CMD.ITEM_COMMIT], 'Finishing the upload');
	}

	// Stores a compressed .ledanim blob (webui/compression.js) as a new
	// animation in the store, and plays it -- see storeItem().
	uploadPattern(bytes, name = 'PATTERN') {
		return this.storeItem(ITEM_TYPE.ANIMATION, name, bytes);
	}

	// [{index, type, length, name}] for every item, plus the status.
	async listItems() {
		const status = await this._checked([CMD.QUERY], 'Reading the store');
		const items = [];
		for (let i = 0; i < status.count; i++) {
			const s = await this._checked([CMD.ITEM_INFO, i], 'Reading the store');
			items.push({ index: i, ...s.item });
		}
		return { status, items };
	}

	runItem(index, boot = false) {
		return this._checked([CMD.ITEM_RUN, index, boot ? 1 : 0], 'Starting it');
	}

	stop() {
		return this._send([CMD.STOP]);
	}

	// Removes one item; the items after it move down one index
	deleteItem(index) {
		return this._checked([CMD.ITEM_DELETE, index], 'Deleting it');
	}

	eraseStore() {
		return this._send([CMD.STORE_ERASE]);
	}

	// The firmware's identity, "HH27-STARFISH-FW S1 <commit>" (webusb_protocol.h
	// FW_INFO); null from firmware that does not know the command. Throws if
	// no reply came: _send turns a USB error into no reply, and that must not
	// read as old firmware.
	async firmwareInfo() {
		const status = await this._send([CMD.FW_INFO]);
		if (!status) throw new Error('the badge did not answer FW_INFO');
		return status.firmware !== undefined ? status.firmware : null;
	}

	// Reboots the badge into its USB boot ROM (as UPDATE in the badge's menu), to flash new
	// firmware. The badge disconnects right after the reply.
	rebootToBootRom() {
		return this._send([CMD.BOOT_ROM]);
	}

	// The owner's name, kept on the badge for apps (persist.h)
	async getName() {
		return (await this._checked([CMD.NAME_GET], 'Reading the name')).name ?? '';
	}

	async setName(name) {
		const bytes = new TextEncoder().encode(name).subarray(0, 32);
		return (await this._checked([CMD.NAME_SET, ...bytes], 'Saving the name')).name ?? '';
	}
}
