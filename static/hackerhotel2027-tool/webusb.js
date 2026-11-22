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
	QUERY: 0xff,
};

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
		try {
			await this.device.close();
		} catch (e) {
			/* already gone */
		}
		this.device = null;
		this.dispatchEvent(new CustomEvent('disconnect'));
	}

	// Sends one command packet and returns the 2-byte status reply as
	// {mode, brightness}, or null if nothing is connected.
	_send(bytes) {
		this._queue = this._queue.then(() => this._sendNow(bytes)).catch((e) => {
			console.error('LED matrix USB error', e);
			this.dispatchEvent(new CustomEvent('error', { detail: e }));
		});
		return this._queue;
	}

	async _sendNow(bytes) {
		if (!this.device) return null;
		await this.device.transferOut(EP_OUT, new Uint8Array(bytes));
		const result = await this.device.transferIn(EP_IN, 64);
		if (result.data && result.data.byteLength >= 2) {
			const status = { mode: result.data.getUint8(0), brightness: result.data.getUint8(1) };
			this.dispatchEvent(new CustomEvent('status', { detail: status }));
			return status;
		}
		return null;
	}

	setPixel(row, col, brightness) {
		return this._send([CMD.SET_PIXEL, row, col, brightness]);
	}

	// frame: Uint8Array(352), row-major (index = row*16+col).
	async uploadFrame(frame) {
		const CHUNK = 58;
		for (let offset = 0; offset < frame.length; offset += CHUNK) {
			const slice = frame.subarray(offset, Math.min(offset + CHUNK, frame.length));
			await this._send([
				CMD.FRAME_CHUNK,
				offset & 0xff,
				(offset >> 8) & 0xff,
				...slice,
			]);
		}
		return this._send([CMD.FRAME_COMMIT]);
	}

	clear() {
		return this._send([CMD.CLEAR]);
	}

	query() {
		return this._send([CMD.QUERY]);
	}

	// Stores a compressed .ledanim blob (webui/compression.js,
	// docs/ANIMATION_FORMAT.md) into the device's flash (pattern_flash.h)
	// and starts it playing on repeat immediately -- see
	// CMD_PATTERN_BEGIN/CHUNK/COMMIT in webusb_protocol.h. It then
	// autoplays on every future boot too, with no host connected.
	// PATTERN_BEGIN erases the whole reserved region (128 page erases)
	// before replying, so this can take a couple hundred ms before the
	// first chunk should go out.
	async uploadPattern( bytes ) {
		await this._send([CMD.PATTERN_BEGIN]);
		const CHUNK = 60;
		for (let offset = 0; offset < bytes.length; offset += CHUNK) {
			const slice = bytes.subarray(offset, Math.min(offset + CHUNK, bytes.length));
			await this._send([CMD.PATTERN_CHUNK, ...slice]);
		}
		return this._send([CMD.PATTERN_COMMIT]);
	}
}
