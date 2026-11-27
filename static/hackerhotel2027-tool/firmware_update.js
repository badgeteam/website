// The Firmware panel: shows the badge's firmware and this site's, and
// flashes new firmware through the CH643's USB boot ROM (wchisp.js), the
// same way as `minichlink -w ledmatrix.bin flash -b`. The items, the name and
// the settings in the top 32 KB of flash stay: the boot ROM erases only
// from address 0, and wchisp.js never goes past 0x7800.
//
// The flow, and why it is shaped this way (docs/FIRMWARE_UPDATE.md):
// - Chrome needs a click to open its device chooser, and the boot ROM has no
//   serial number, so the user picks it in the chooser on every update.
// - The boot ROM goes back to the firmware after about 4.6 s if no host
//   talks to it. So while the chooser is open, each time the badge's
//   firmware comes back, the page sends it into the boot ROM again: the user
//   can take as long as they like.
// - Page 0 is written last, after the rest is verified: until then the
//   first word of flash is erased, so the boot ROM starts by itself.
'use strict';

const FW_MARKER = 'HH27-STARFISH-FW ';
const FW_STORE_LAYOUT = 'S1'; // the item store layout this page's badges use
const FW_MAX_BYTES = 30 * 1024; // the firmware region, below the item store

const fwBadgeEl = document.getElementById('fw-badge');
const fwSiteEl = document.getElementById('fw-site');
const fwStatusEl = document.getElementById('fw-status');
const fwProgressEl = document.getElementById('fw-progress');
const fwUpdateBtn = document.getElementById('fw-update-btn');
const fwConfirmEl = document.getElementById('fw-confirm');
const fwGoBtn = document.getElementById('fw-go-btn');
const fwCancelBtn = document.getElementById('fw-cancel-btn');
const fwFileInput = document.getElementById('fw-file-input');
const fwConfirmText = fwConfirmEl.querySelector('span');

// Focus moves to the confirmation and to the status line, so they take
// focus from script but stay out of the tab order
fwConfirmText.setAttribute('tabindex', '-1');
fwStatusEl.setAttribute('tabindex', '-1');

let fwBundled = null; // {image, commit, date} from firmware/ on this site
let fwChosen = null; // {image, name} from a file the user picked
let fwBadge = undefined; // the badge's FW_INFO text; null: too old to say; false: no answer
let fwBusy = false;
let fwWaitingForRom = false; // the chooser is open: keep the badge in the boot ROM
let fwReason = ''; // why the update button is off, as shown in #fw-status

// "HH27-STARFISH-FW S1 abc1234" -> {layout: 'S1', version: 'abc1234'}, or null
function parseFirmwareId(text) {
	if (!text || !text.startsWith(FW_MARKER)) return null;
	const [layout, version = ''] = text.slice(FW_MARKER.length).split(' ');
	return { layout, version };
}

// The identity string inside an image, or null: the marker and what follows
// up to the NUL (webusb_protocol.c s_fw_info)
function imageFirmwareId(image) {
	const marker = new TextEncoder().encode(FW_MARKER);
	outer: for (let i = 0; i + marker.length <= image.length; i++) {
		for (let k = 0; k < marker.length; k++) if (image[i + k] !== marker[k]) continue outer;
		let end = i;
		while (end < image.length && image[end] !== 0 && end - i < 48) end++;
		return parseFirmwareId(new TextDecoder().decode(image.subarray(i, end)));
	}
	return null;
}

// Throws unless image is badge firmware that keeps the stored items
function checkImage(image) {
	if (image.length > FW_MAX_BYTES) throw new Error(`it is ${image.length} bytes, and the firmware region holds ${FW_MAX_BYTES}`);
	if (image.length < 1024) throw new Error('it is too small to be the firmware');
	const id = imageFirmwareId(image);
	if (!id) throw new Error('it is not starfish badge firmware (no HH27-STARFISH-FW marker). Use the .bin file, not the .hex or .elf');
	if (id.layout !== FW_STORE_LAYOUT)
		throw new Error(`it stores items differently (${id.layout}; this site knows ${FW_STORE_LAYOUT}), so your stored items would be lost`);
	return id;
}

// Sets the text only when it changes, so a live region does not repeat it
function setText(el, text) {
	if (el.textContent !== text) el.textContent = text;
}

function renderFirmware() {
	const usb = 'usb' in navigator;
	const site = fwBundled ? `${fwBundled.commit} (${fwBundled.date})` : null;
	setText(fwSiteEl, site ? `This site's firmware: ${site}` : 'This site has no firmware file. To flash one, open "Advanced: flash a .bin file".');
	const badgeId = parseFirmwareId(fwBadge);
	const upToDate = !!(device.connected && !device.emulator && badgeId && fwBundled && badgeId.version === fwBundled.commit);
	let badge;
	if (!device.connected) badge = 'Badge: connect it to see its firmware.';
	else if (device.emulator) badge = 'Badge: the emulator.';
	else if (fwBadge === null) badge = 'Badge: older firmware. It does not report its version.';
	else if (fwBadge === false) badge = 'Badge: it did not say which firmware it runs. Reload the page to ask again.';
	else if (badgeId) badge = `Badge: ${badgeId.version}${upToDate ? ' – up to date' : fwBundled ? ' – an update is available' : ''}`;
	else badge = 'Badge: asking which firmware it runs…';
	setText(fwBadgeEl, badge);
	const image = fwChosen || fwBundled;
	setText(fwUpdateBtn, fwChosen ? `Flash ${fwChosen.name}` : fwBundled ? `Update firmware to ${fwBundled.commit}` : 'Update firmware');
	// The reason the button is off, in words on the page (not in a tooltip)
	let reason = '';
	if (fwBusy) {
		/* the status shows the update */
	} else if (!usb) reason = "This browser can't connect to USB devices. Use Chrome, Edge or Opera.";
	else if (device.emulator) reason = 'The emulator has no firmware to update.';
	else if (!fwChosen && upToDate) reason = 'The badge already runs this site\'s firmware.';
	fwUpdateBtn.disabled = fwBusy || !usb || !image || device.emulator || (!fwChosen && upToDate);
	// Show the reason only over an empty status or an older reason, never over
	// the result of an update
	if (fwStatusEl.textContent === '' || fwStatusEl.textContent === fwReason) setText(fwStatusEl, reason);
	fwReason = reason;
}

// Asks the badge which firmware it runs. Right after the badge restarts
// (a firmware update) the first question can get no answer, so it asks up
// to three times. Only an answer without the version means old firmware.
let fwAsking = 0; // the newest question; an older one that ends late is ignored
async function refreshBadgeFirmware() {
	const asking = ++fwAsking;
	fwBadge = undefined;
	renderFirmware();
	if (!device.connected || device.emulator) return;
	let info = false;
	for (let attempt = 0; attempt < 3 && info === false; attempt++) {
		if (attempt) await new Promise((resolve) => setTimeout(resolve, 500));
		if (asking !== fwAsking || !device.connected) return;
		try {
			info = await device.firmwareInfo();
		} catch (e) {
			/* no answer: ask again */
		}
	}
	if (asking !== fwAsking) return;
	fwBadge = info;
	renderFirmware();
}

// Always writes, so the same message after a second try is read out again
function setStatus(text, progress = null) {
	fwStatusEl.textContent = text;
	fwProgressEl.hidden = progress === null;
	if (progress !== null) fwProgressEl.value = progress;
}

// While the chooser is open: each time the badge's firmware (1209:d643)
// comes back, send it into the boot ROM again. Its permission persists
// (it has a serial number), so this needs no click.
navigator.usb?.addEventListener('connect', async (ev) => {
	if (!fwWaitingForRom || ev.device.vendorId !== 0x1209 || ev.device.productId !== 0xd643) return;
	try {
		await device.tryAutoReconnect();
		if (fwWaitingForRom && device.connected) await device.rebootToBootRom();
	} catch (e) {
		/* it comes round again */
	}
});

async function flash(image, label) {
	fwBusy = true;
	renderFirmware();
	const viaBadge = device.connected && !device.emulator;
	let rom;
	try {
		fwWaitingForRom = true;
		if (viaBadge) device.rebootToBootRom().catch(() => {});
		setStatus(viaBadge
			? 'The badge restarts into its boot ROM. In the box that opens, pick "Unknown device from QinHeng Electronics" and click Connect.'
			: 'On the badge, hold A for the menu, press C to reach UPDATE, and press A (or, on newer firmware, hold C and D for 3 seconds). In the box that opens, pick "Unknown device from QinHeng Electronics" and click Connect.');
		// No await before this line: Chrome opens the chooser only within the click
		rom = await navigator.usb.requestDevice({ filters: WchIsp.filters });
	} catch (e) {
		fwWaitingForRom = false;
		fwBusy = false;
		setStatus(e.name === 'NotFoundError'
			? 'You picked no boot ROM, so nothing changed. The badge goes back to its firmware by itself. ' +
			  'On Windows, the boot ROM shows up only after a one-time driver install. See "Help: drivers, browsers and recovery".'
			: `Could not open the chooser: ${e.message}`);
		renderFirmware();
		return;
	}
	fwWaitingForRom = false;
	const isp = new WchIsp(rom);
	const names = { identify: 'Connecting', erase: 'Erasing', write: 'Writing', verify: 'Checking',
		'write-boot-page': 'Writing the first page', 'verify-boot-page': 'Checking the first page', reset: 'Restarting', done: 'Done' };
	// #fw-status is a live region: its text changes only at a new phase or a
	// new 25% step, so a screen reader does not read every packet. The bar
	// follows every step.
	let lastPhase = null;
	let lastStep = -1;
	try {
		const info = await isp.flashFirmware(image, {
			onProgress: ({ phase, percent }) => {
				const step = Math.floor(percent / 25);
				// 'done' needs no line of its own: the result follows at once
				if (phase === 'done' || (phase === lastPhase && step === lastStep)) {
					fwProgressEl.value = percent;
					return;
				}
				lastPhase = phase;
				lastStep = step;
				setStatus(`${label}: ${names[phase] || phase}… ${percent}%`, percent);
			},
		});
		setStatus(`Done: ${label} is on the badge (${info.bytes} bytes, checked). The badge restarts. Your items, name and settings stayed.`, 100);
		setTimeout(async () => {
			try { await device.tryAutoReconnect(); } catch (e) { /* the user connects again */ }
			refreshBadgeFirmware();
		}, 2500);
	} catch (e) {
		const advice = e.bootPageWritten
			? 'If the badge does not start, unplug it and its battery, then plug it in again. It then starts in the boot ROM, and you can update again. ' +
			  'If that does not help, bring the badge to the badge recovery area at the event.'
			: 'The badge\'s start page was not touched, so it starts the boot ROM or its old firmware. Try again.';
		setStatus(`The update stopped (${e.phase || 'start'}): ${e.message} ${advice}`);
		await isp.close();
	} finally {
		fwBusy = false;
		renderFirmware();
	}
}

// Two clicks: the first shows what will happen, the second (a fresh click,
// so Chrome allows the chooser) starts it. Each hidden button hands focus
// on: Update to the question, Flash now to the status, Cancel back to Update.
fwUpdateBtn.addEventListener('click', () => {
	const image = fwChosen ? fwChosen.image : fwBundled && fwBundled.image;
	if (!image) return;
	try {
		const id = checkImage(image);
		fwConfirmText.textContent =
			`Flash firmware ${id.version} onto the badge? Your items, name and settings stay. Keep the badge plugged in until it is done.`;
		fwConfirmEl.hidden = false;
		fwConfirmText.focus();
	} catch (e) {
		setStatus(`You can't flash this file: ${e.message}.`);
		fwStatusEl.focus();
	}
});
fwCancelBtn.addEventListener('click', () => {
	fwConfirmEl.hidden = true;
	fwUpdateBtn.focus();
});
fwGoBtn.addEventListener('click', () => {
	fwConfirmEl.hidden = true;
	fwStatusEl.focus();
	const image = fwChosen ? fwChosen.image : fwBundled.image;
	flash(image, fwChosen ? fwChosen.name : `firmware ${fwBundled.commit}`);
});

fwFileInput.addEventListener('change', async (ev) => {
	const file = ev.target.files[0];
	ev.target.value = '';
	if (!file) return;
	const image = new Uint8Array(await file.arrayBuffer());
	try {
		checkImage(image);
		fwChosen = { image, name: file.name };
		setStatus(`${file.name} is ready. Click "Flash ${file.name}".`);
	} catch (e) {
		fwChosen = null;
		setStatus(`You can't flash ${file.name}: ${e.message}.`);
	}
	renderFirmware();
});

device.addEventListener('connect', refreshBadgeFirmware);
device.addEventListener('disconnect', () => { fwBadge = undefined; renderFirmware(); });

// This site's firmware: firmware/ledmatrix.bin and firmware.json, written by
// tools/deploy_webui.sh (or `make webui-firmware` for a local copy)
Promise.all([
	fetch('firmware/firmware.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
	fetch('firmware/ledmatrix.bin', { cache: 'no-store' }).then((r) => (r.ok ? r.arrayBuffer() : null)),
])
	.then(([meta, bin]) => {
		if (meta && bin) fwBundled = { image: new Uint8Array(bin), commit: meta.commit, date: meta.date };
	})
	.catch(() => {})
	.finally(renderFirmware);
renderFirmware();
if (device.connected) refreshBadgeFirmware();
