'use strict';

const device = new LedMatrixDevice();
const board = new BoardView(document.getElementById('board-container'));

// --- Brush / painting ---------------------------------------------------

const brushValueInput = document.getElementById('brush-value');
const brushValueReadout = document.getElementById('brush-value-readout');
const brushRadiusInput = document.getElementById('brush-radius');
const liveSendInput = document.getElementById('live-send');
const eraseToggle = document.getElementById('erase-mode');
const brushTargetInput = document.getElementById('brush-target');
const brushColorInput = document.getElementById('brush-color');

function currentBrushLevel(erase = eraseToggle.checked) {
	return erase ? 0 : Number(brushValueInput.value);
}

function currentBrushColor(erase = eraseToggle.checked) {
	return erase ? [0, 0, 0] : hexToRgbChannels(brushColorInput.value);
}

function hexToRgbChannels(hex) {
	return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

brushValueInput.addEventListener('input', () => {
	brushValueReadout.textContent = brushValueInput.value;
});

// "White LEDs" paints a brightness onto the mono LEDs, "RGB LEDs" paints a
// color onto the RGB accent LEDs: each mode only touches its own LEDs.
brushTargetInput.addEventListener('change', () => {
	const rgb = brushTargetInput.value === 'rgb';
	board.rgbBrush = rgb;
	board.container.classList.toggle('rgb-brush', rgb);
	document.getElementById('brush-brightness-control').hidden = rgb;
	document.getElementById('brush-color-control').hidden = !rgb;
});

// Paints with the brush at a board position (millimeters). `erase` paints
// black whatever the Eraser box says (the board's Delete key). Returns
// false when no LED of the brush's kind was in reach.
function paintAt(xmm, ymm, erase = eraseToggle.checked) {
	const radius = Number(brushRadiusInput.value);
	const pickRadius = Math.max(radius, 1.6); // always usable even at radius 0
	let touched = false;
	let hit = false;
	if (board.rgbBrush) {
		const [r, g, b] = currentBrushColor(erase);
		for (const led of BOARD_DATA.rgb_leds) {
			if (Math.hypot(led.x - xmm, led.y - ymm) > pickRadius) continue;
			hit = true;
			const [cr, cg, cb] = board.getRgb(led);
			if (cr === r && cg === g && cb === b) continue; // don't resend while dragging over it
			setRgbChannels(led, r, g, b);
			touched = true;
		}
	} else {
		const level = currentBrushLevel(erase);
		for (const led of BOARD_DATA.leds) {
			if (Math.hypot(led.x - xmm, led.y - ymm) <= pickRadius) {
				paintPixel(led.row, led.col, level);
				touched = true;
				hit = true;
			}
		}
	}
	if (touched) markFrameDirty();
	return hit;
}

board.onPaintAt = (xmm, ymm) => paintAt(xmm, ymm);
board.onEraseAt = (xmm, ymm) => paintAt(xmm, ymm, true);

function paintPixel(row, col, level) {
	board.setPixel(row, col, level);
	currentFrame()[row * MATRIX_COLS + col] = level;
	liveSendCell(row * MATRIX_COLS + col);
}

// --- RGB LED selection/editing ---------------------------------------------------
// An RGB LED's three channels are three ordinary cells in the same frame
// array a mono LED's single cell lives in (see docs/LEDPWM_MATRIX.md) --
// so "driving" one is just three paintPixel() calls, no separate protocol
// or pattern-storage support needed.

const rgbEditor = document.getElementById('rgb-editor');
const rgbEditorLabel = document.getElementById('rgb-editor-label');
const rgbColorInput = document.getElementById('rgb-color-input');
let selectedRgbLed = null;

function rgbToHex(r, g, b) {
	return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function paintRgb(led, r, g, b) {
	setRgbChannels(led, r, g, b);
	markFrameDirty();
}

// Like paintRgb() but without refreshing the frame strip, for painting many
// LEDs at once (the caller calls markFrameDirty() once afterwards)
function setRgbChannels(led, r, g, b) {
	board.setRgb(led, r, g, b);
	const frame = currentFrame();
	frame[led.row * MATRIX_COLS + led.col] = r;
	frame[led.green_row * MATRIX_COLS + led.col] = g;
	frame[led.blue_row * MATRIX_COLS + led.col] = b;
	liveSendCell(led.row * MATRIX_COLS + led.col);
	liveSendCell(led.green_row * MATRIX_COLS + led.col);
	liveSendCell(led.blue_row * MATRIX_COLS + led.col);
}

// --- Live send: the badge shows the editor ---------------------------------------------------
// Painting and the player both go through liveFlush(). Only one send is
// on its way at a time. Changes made while it is on its way go into the
// next send, so a fast brush or a high fps never builds up a queue of old
// packets in front of Run or Stop.

const LIVE_PIXEL_LIMIT = 8; // more changed LEDs than this: send the whole frame
const liveDirty = new Set(); // matrix cells changed since the last send
let liveWholeFrame = false; // send the whole frame next
let liveStale = true; // the badge does not show the editor's frame
let liveSending = false;
let badgeMode = null; // APP_MODE_* from the badge's last reply

function liveSendOn() {
	return liveSendInput.checked && device.connected;
}

function liveSendCell(index) {
	if (!liveSendOn()) return;
	liveDirty.add(index);
	liveFlush();
}

function liveSendFrame() {
	if (!liveSendOn()) return;
	liveWholeFrame = true;
	liveFlush();
}

// Forget what is waiting: the badge gets something else to show
function liveCancel() {
	liveDirty.clear();
	liveWholeFrame = false;
	liveStale = true;
}

async function liveFlush() {
	if (liveSending) return;
	liveSending = true;
	try {
		while (liveWholeFrame || liveDirty.size) {
			const frame = currentFrame();
			// If the badge shows another frame or runs an item, single
			// LEDs would mix the editor into it: send the whole frame
			const badgeElsewhere = badgeMode !== MODE_CUSTOM;
			if (liveWholeFrame || liveStale || badgeElsewhere || liveDirty.size > LIVE_PIXEL_LIMIT) {
				liveWholeFrame = false;
				liveDirty.clear();
				liveStale = false;
				await device.uploadFrame(Uint8Array.from(frame));
			} else {
				const cells = [...liveDirty];
				liveDirty.clear();
				// queued together, like the packets of a frame
				await Promise.all(cells.map((i) => device.setPixel(Math.floor(i / MATRIX_COLS), i % MATRIX_COLS, frame[i])));
			}
		}
	} finally {
		liveSending = false;
	}
}

device.addEventListener('connect', liveCancel);
liveSendInput.addEventListener('change', liveCancel);

// Where focus goes back to when the editor closes
let rgbEditorOpener = null;

// From the keyboard, the editor takes focus and scrolls into view. From a
// pointer it takes focus without scrolling, so the LED you clicked stays
// on the screen.
board.onSelectRgb = (led, { keyboard = false } = {}) => {
	selectedRgbLed = led;
	rgbEditorLabel.textContent = led.ref;
	rgbColorInput.value = rgbToHex(...board.getRgb(led));
	if (rgbEditor.hidden) rgbEditorOpener = document.activeElement;
	rgbEditor.hidden = false;
	rgbColorInput.focus(keyboard ? undefined : { preventScroll: true });
};

function closeRgbEditor() {
	rgbEditor.hidden = true;
	selectedRgbLed = null;
	const opener = rgbEditorOpener;
	rgbEditorOpener = null;
	if (opener && opener !== document.body && opener.isConnected && typeof opener.focus === 'function') opener.focus();
	else if (board.svg && typeof board.svg.focus === 'function') board.svg.focus();
}

rgbColorInput.addEventListener('input', () => {
	if (!selectedRgbLed) return;
	paintRgb(selectedRgbLed, ...hexToRgbChannels(rgbColorInput.value));
});

document.getElementById('rgb-editor-off-btn').addEventListener('click', () => {
	if (!selectedRgbLed) return;
	paintRgb(selectedRgbLed, 0, 0, 0);
	rgbColorInput.value = '#000000';
});

document.getElementById('rgb-editor-close-btn').addEventListener('click', closeRgbEditor);
rgbEditor.addEventListener('keydown', (ev) => {
	if (ev.key === 'Escape' && !rgbEditor.hidden) {
		ev.preventDefault();
		closeRgbEditor();
	}
});

// --- Device connection ---------------------------------------------------

const connectBtn = document.getElementById('connect-btn');
const emuBtn = document.getElementById('emu-btn');
let emulatorHere = false; // tools/emu/emu.py --web serves this page
const disconnectBtn = document.getElementById('disconnect-btn');
const connStatusEl = document.getElementById('conn-status');
const deviceModeEl = document.getElementById('device-mode');
const firstRunEl = document.getElementById('first-run');
const fwCtaEl = document.getElementById('fw-cta');
const fwOldNoticeEl = document.getElementById('fw-old-notice');
const NO_WEBUSB_TEXT = "This browser can't connect to USB devices. Use Chrome, Edge or Opera.";

function webUsbAvailable() {
	return typeof navigator !== 'undefined' && !!navigator.usb;
}

function refreshConnButtons() {
	// A button that hides while it has focus would drop focus to the page:
	// hand it to the button that takes its place
	const focused = document.activeElement;
	const hadFocus = focused === connectBtn || focused === emuBtn || focused === disconnectBtn;
	connectBtn.hidden = device.connected;
	emuBtn.hidden = device.connected || !emulatorHere;
	disconnectBtn.hidden = !device.connected;
	if (hadFocus && focused.hidden) {
		if (device.connected) disconnectBtn.focus();
		else if (connectBtn.disabled && !emuBtn.hidden) emuBtn.focus();
		else connectBtn.focus();
	}

	const text = device.connected ? (device.emulator ? 'Connected to the emulator' : 'Connected') : 'Not connected';
	if (connStatusEl.textContent !== text) connStatusEl.textContent = text; // the CSS draws the check
	connStatusEl.classList.toggle('connected', device.connected);
	if (firstRunEl) firstRunEl.hidden = device.connected;
	if (!device.connected) {
		if (fwOldNoticeEl) fwOldNoticeEl.hidden = true;
		if (fwCtaEl) fwCtaEl.hidden = true;
		if (!webUsbAvailable()) uiAnnounce(deviceModeEl, NO_WEBUSB_TEXT);
		else if (!uiHasError(deviceModeEl)) uiAnnounce(deviceModeEl, '');
	}
}

connectBtn.addEventListener('click', async () => {
	try {
		await device.requestAndOpen();
	} catch (e) {
		if (e.name !== 'NotFoundError') uiError(deviceModeEl, `Couldn't connect to the badge: ${e.message}`);
	}
});
disconnectBtn.addEventListener('click', () => device.disconnect());
emuBtn.addEventListener('click', () =>
	device.connectEmulator().catch((e) => uiError(deviceModeEl, `Couldn't connect to the emulator: ${e.message}`))
);
LedMatrixDevice.emulatorPresent().then((here) => {
	emulatorHere = here;
	refreshConnButtons();
});
device.addEventListener('connect', refreshConnButtons);
device.addEventListener('disconnect', refreshConnButtons);
if (fwCtaEl) {
	// The link scrolls to the Firmware card; the update button there takes focus
	fwCtaEl.addEventListener('click', () => {
		const btn = document.getElementById('fw-update-btn');
		if (btn && !btn.disabled && !btn.hidden) setTimeout(() => btn.focus(), 0);
	});
}
// Must match APP_MODE_* in the firmware's webusb_protocol.h
const DEVICE_MODE_NAMES = {
	1: 'Showing your drawing',
	2: 'Playing a stored animation or text',
	3: 'Running an app',
	4: 'Showing your name',
};
const MODE_CUSTOM = 1;
const MODE_ITEM = 2;
const MODE_APP = 3;
let oldFirmwareAnnounced = false; // said once per connection, not every second

device.addEventListener('connect', () => {
	oldFirmwareAnnounced = false;
});

device.addEventListener('status', (ev) => {
	const { mode, brightness } = ev.detail;
	badgeMode = mode;
	// "Playing: NAME" when the store list knows the running item
	const running =
		(mode === MODE_ITEM || mode === MODE_APP) && storeItems.find((item) => item.index === ev.detail.running);
	const what = running ? `Playing: ${running.name || 'an item with no name'}` : DEVICE_MODE_NAMES[mode] ?? `Mode ${mode}`;
	const serial = device.serialNumber;
	const text = `${what} · Brightness ${brightness} of 255` + (serial ? ` · Serial ${serial}` : '');
	// Older firmware: a warning of its own, above the Update firmware button
	const old = ev.detail.api !== undefined && ev.detail.api < FIRMWARE_API;
	if (old) {
		const sentence =
			`This badge has older firmware (API ${ev.detail.api}; this page needs ${FIRMWARE_API}). ` +
			'Update it to use everything here.';
		if (fwOldNoticeEl && fwOldNoticeEl.textContent !== sentence) fwOldNoticeEl.textContent = sentence;
		if (!oldFirmwareAnnounced) {
			oldFirmwareAnnounced = true;
			uiAnnounce(null, sentence);
		}
	}
	if (fwOldNoticeEl) fwOldNoticeEl.hidden = !old;
	if (fwCtaEl) fwCtaEl.hidden = !old;
	// not a live region: it changes every second
	if (deviceModeEl.textContent !== text || uiHasError(deviceModeEl)) uiAnnounce(deviceModeEl, text);
	storeStatusChanged(ev.detail);
});

if (!webUsbAvailable()) {
	connectBtn.disabled = true;
} else {
	device.tryAutoReconnect().catch(() => {});
}
// the emulator works without WebUSB, so the status poll runs either way
setInterval(() => {
	if (device.connected) device.query();
}, 1000);
refreshConnButtons();

// --- Clear / send ---------------------------------------------------

document.getElementById('clear-btn').addEventListener('click', () => {
	board.clear();
	currentFrame().fill(0);
	stopPlayback();
	liveCancel();
	if (device.connected) device.clear();
	liveStale = false;
});

const sendFrameBtn = document.getElementById('send-frame-btn');
sendFrameBtn.addEventListener('click', () => {
	if (!device.connected) {
		uiErrorFor(sendFrameBtn, 'Connect your badge first.');
		return;
	}
	stopPlayback();
	liveSendFrame();
	if (!liveSendOn()) device.uploadFrame(Uint8Array.from(currentFrame()));
});

// --- Create animation tabs ---------------------------------------------------

const animationTabs = [...document.querySelectorAll('.tab-bar [role="tab"]')];

// The ARIA tabs pattern: only the selected tab is a tab stop (roving
// tabindex); the arrow keys, Home and End move between the tabs and select.
function selectAnimationTab(selected, focus = false) {
	for (const tab of animationTabs) {
		const isSelected = tab === selected;
		tab.setAttribute('aria-selected', String(isSelected));
		tab.tabIndex = isSelected ? 0 : -1;
		const panel = document.getElementById(tab.getAttribute('aria-controls'));
		if (panel) panel.hidden = !isSelected;
	}
	if (focus) selected.focus();
}

for (const tab of animationTabs) {
	tab.addEventListener('click', () => selectAnimationTab(tab));
	tab.addEventListener('keydown', (ev) => {
		const i = animationTabs.indexOf(tab);
		const n = animationTabs.length;
		const next = {
			ArrowRight: (i + 1) % n,
			ArrowLeft: (i - 1 + n) % n,
			Home: 0,
			End: n - 1,
		}[ev.key];
		if (next === undefined || ev.altKey || ev.ctrlKey || ev.metaKey) return;
		ev.preventDefault();
		selectAnimationTab(animationTabs[next], true);
	});
}
selectAnimationTab(animationTabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || animationTabs[0]);

// --- Built-in test animation: techno pharmacy sign ---------------------------------------------------
// A pharmacy sign as reimagined for a rave: a neon-tube flicker-on, a hard
// strobe cutting between the green cross and the white body, a chase
// sweeping around the starfish's arms, a complementary green/white breathe,
// a sparkling second chase over just the RGB accents, and a strobe finale --
// then it loops. The board's RGB accent LEDs stand in for the green cross,
// its mono LEDs for the white body; everything below is just brightness
// values written into those two groups of cells across many frames.

function buildPharmacySignPattern() {
	const monoLeds = BOARD_DATA.leds;
	const rgbLeds = BOARD_DATA.rgb_leds;
	// Angle around the board center gives a stable sweep order for the
	// chase effects -- walking the list in this order visits LEDs roughly
	// in a ring around the starfish rather than in wiring (row/col) order.
	const byAngle = (a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x);
	const monoByAngle = [...monoLeds].sort(byAngle);
	const rgbByAngle = [...rgbLeds].sort(byAngle);

	const blank = () => emptyFrame();
	const withWhite = (frame, level) => {
		for (const led of monoLeds) frame[led.row * MATRIX_COLS + led.col] = level;
		return frame;
	};
	const withGreen = (frame, level) => {
		for (const led of rgbLeds) frame[led.green_row * MATRIX_COLS + led.col] = level;
		return frame;
	};
	// One step of a comet-style chase: `cellOf` maps a ring entry to its
	// frame index, `headPos` is the (fractional) ring position of the
	// brightest point, and the brightness tapers linearly to 0 over
	// `tailLength` ring steps on either side of it.
	const chaseFrame = (ring, cellOf, headPos, tailLength, maxLevel) => {
		const frame = blank();
		const n = ring.length;
		for (let i = 0; i < n; i++) {
			let dist = Math.abs(i - headPos);
			dist = Math.min(dist, n - dist);
			if (dist <= tailLength) {
				frame[cellOf(ring[i])] = Math.round(maxLevel * (1 - dist / tailLength));
			}
		}
		return frame;
	};
	const monoCell = (led) => led.row * MATRIX_COLS + led.col;
	const greenCell = (led) => led.green_row * MATRIX_COLS + led.col;

	const frames = [];

	// 1. Neon tube flicker-on: the green cross stutters to life.
	for (const level of [50, 0, 130, 0, 90, 200, 0, 255, 180, 255, 255]) {
		frames.push(withGreen(blank(), level));
	}
	for (let i = 0; i < 4; i++) frames.push(withGreen(blank(), 255));

	// 2. Hard strobe: green cross <-> white body, full snap each beat.
	// Each state holds STROBE_HOLD frames: at 12 fps the whole board
	// changes at most 3 times a second, under the WCAG 2.3.1 flash limit.
	const STROBE_HOLD = 4;
	const hold = (frame) => {
		for (let k = 0; k < STROBE_HOLD; k++) frames.push(k ? frame.slice() : frame);
	};
	for (let i = 0; i < 2; i++) {
		hold(withGreen(blank(), 255));
		hold(blank());
		hold(withWhite(blank(), 255));
		hold(blank());
	}
	for (let i = 0; i < 4; i++) frames.push(withWhite(blank(), 255));

	// 3. White chase sweeping once around the starfish's arms, with a dim
	// green base glow so the cross stays visible through the sweep.
	const whiteChaseSteps = 36;
	for (let s = 0; s < whiteChaseSteps; s++) {
		const headPos = (s / whiteChaseSteps) * monoByAngle.length;
		const frame = chaseFrame(monoByAngle, monoCell, headPos, 9, 255);
		withGreen(frame, 60);
		frames.push(frame);
	}

	// 4. Complementary breathe: green and white crossfade against each
	// other through a full cycle.
	const breatheSteps = 24;
	for (let s = 0; s < breatheSteps; s++) {
		const level = Math.round(127.5 + 127.5 * Math.sin((s / breatheSteps) * Math.PI * 2));
		const frame = withWhite(blank(), level);
		withGreen(frame, 255 - level);
		frames.push(frame);
	}

	// 5. Green chase around just the RGB accents, reverse direction, with
	// white sparkle/twinkle scattered across the body for a "techno" glint.
	const greenChaseSteps = 28;
	for (let s = 0; s < greenChaseSteps; s++) {
		const headPos = ((greenChaseSteps - s) / greenChaseSteps) * rgbByAngle.length;
		const frame = chaseFrame(rgbByAngle, greenCell, headPos, 6, 255);
		for (let k = 0; k < 14; k++) {
			const led = monoLeds[Math.floor(Math.random() * monoLeds.length)];
			frame[monoCell(led)] = Math.random() < 0.5 ? 150 : 255;
		}
		frames.push(frame);
	}

	// 6. Strobe finale: both colors slammed on together against total
	// blackout, before looping back to the flicker-on.
	// (held like the strobe above, for the same reason)
	for (let i = 0; i < 3; i++) {
		const frame = withWhite(blank(), 255);
		withGreen(frame, 255);
		hold(frame);
		hold(blank());
	}

	const pattern = newPattern('Techno pharmacy sign (demo)');
	pattern.fps = 12;
	pattern.frames = frames;
	return pattern;
}

document.getElementById('pharmacy-sign-btn').addEventListener('click', async () => {
	if (!(await confirmDiscard())) return;
	const pattern = buildPharmacySignPattern();
	savePattern(pattern);
	renderPatternList();
	setActivePattern(pattern);
});

// --- Import from video ---------------------------------------------------
// Logic lives in video_import.js (extractFramesFromVideo); this just wires
// it to the panel and, on success, installs the result as a new pattern
// through the same path the pattern-list/import-JSON flows already use.

const videoFileInput = document.getElementById('video-file-input');
const videoFpsInput = document.getElementById('video-fps');
const videoStartInput = document.getElementById('video-start');
const videoDurationInput = document.getElementById('video-duration');
const videoBrightnessInput = document.getElementById('video-brightness');
const videoBrightnessReadout = document.getElementById('video-brightness-readout');
const videoAmbilightInput = document.getElementById('video-ambilight');
const videoNormalHint = document.getElementById('video-normal-hint');
const videoAmbilightHint = document.getElementById('video-ambilight-hint');
const videoConvertBtn = document.getElementById('video-convert-btn');
const videoCancelBtn = document.getElementById('video-cancel-btn');
const videoProgress = document.getElementById('video-progress');
const videoStatus = document.getElementById('video-status');

videoBrightnessInput.addEventListener('input', () => {
	videoBrightnessReadout.textContent = `${Number(videoBrightnessInput.value).toFixed(1)}x`;
});

videoAmbilightInput.addEventListener('change', () => {
	videoNormalHint.hidden = videoAmbilightInput.checked;
	videoAmbilightHint.hidden = !videoAmbilightInput.checked;
});

let videoConversionAborted = false;

// Reads a number input and keeps it within min..max. When the value had
// to change, the input shows the new value and `notes` gets a sentence
// that says why ("Frames per second set to 20, the maximum.").
function clampedInput(input, min, max, fallback, label, notes) {
	const raw = input.value.trim();
	const n = Number(raw);
	if (raw === '' || !Number.isFinite(n)) {
		input.value = fallback;
		notes.push(`${label} was empty or not a number; using ${fallback}.`);
		return fallback;
	}
	if (n < min || n > max) {
		const v = n < min ? min : max;
		input.value = v;
		notes.push(`${label} set to ${v}, the ${n < min ? 'minimum' : 'maximum'}.`);
		return v;
	}
	return n;
}

videoConvertBtn.addEventListener('click', async () => {
	const file = videoFileInput.files[0];
	if (!file) {
		uiError(videoStatus, 'Choose a video or animated image first.');
		videoFileInput.focus();
		return;
	}
	if (!(await confirmDiscard())) return;

	const notes = [];
	const fps = clampedInput(videoFpsInput, 1, 20, 8, 'Frames per second', notes);
	const startTime = clampedInput(videoStartInput, 0, Infinity, 0, 'Start at', notes);
	const duration = clampedInput(videoDurationInput, 0.1, Infinity, 5, 'Duration', notes);

	videoConversionAborted = false;
	const hadFocus = document.activeElement === videoConvertBtn;
	videoCancelBtn.hidden = false;
	if (hadFocus) videoCancelBtn.focus(); // before Convert hides, so focus stays in the panel
	videoConvertBtn.hidden = true;
	videoProgress.hidden = false;
	videoProgress.value = 0;
	uiAnnounce(videoStatus, [...notes, 'Loading the video…'].join(' '));

	try {
		const { frames } = await extractFramesFromVideo(
			file,
			{
				fps,
				startTime,
				duration,
				bounds: board.bounds,
				brightnessBoost: Number(videoBrightnessInput.value) || 1,
				ambilight: videoAmbilightInput.checked,
			},
			(done, total) => {
				videoProgress.value = done / total;
				uiAnnounce(videoStatus, `Reading frame ${done} of ${total}…`, {
					throttleMs: 2000,
					percent: (100 * done) / total,
				});
			},
			() => videoConversionAborted
		);

		if (videoConversionAborted) {
			uiAnnounce(videoStatus, 'Cancelled.');
			return;
		}

		const pattern = newPattern(file.name.replace(/\.[^.]+$/, ''));
		pattern.fps = fps;
		pattern.frames = frames;
		savePattern(pattern);
		renderPatternList();
		setActivePattern(pattern);

		uiAnnounce(videoStatus, [...notes, `Done: ${frames.length} frame${frames.length === 1 ? '' : 's'}.`].join(' '));
	} catch (e) {
		uiError(videoStatus, `Couldn't make an animation of this file: ${e.message}`);
	} finally {
		const cancelHadFocus = document.activeElement === videoCancelBtn;
		videoConvertBtn.hidden = false;
		if (cancelHadFocus) videoConvertBtn.focus();
		videoCancelBtn.hidden = true;
		videoProgress.hidden = true;
	}
});

videoCancelBtn.addEventListener('click', () => {
	videoConversionAborted = true;
	uiAnnounce(videoStatus, 'Cancelling…');
});

// --- Text to animation ---------------------------------------------------
// Logic lives in text_import.js (extractFramesFromText); this just wires it
// to the panel and, on success, installs the result as a new pattern
// through the same path the pattern-list/import-JSON/video flows already
// use.

const textInput = document.getElementById('text-input');
const textFontSizeInput = document.getElementById('text-font-size');
const textFontSizeReadout = document.getElementById('text-font-size-readout');
const textBoldInput = document.getElementById('text-bold');
const textColorInput = document.getElementById('text-color-input');
const textFpsInput = document.getElementById('text-fps');
const textScrollSpeedInput = document.getElementById('text-scroll-speed');
const textBrightnessInput = document.getElementById('text-brightness');
const textBrightnessReadout = document.getElementById('text-brightness-readout');
const textScrollInput = document.getElementById('text-scroll');
const textWhiteEdgeEffectInput = document.getElementById('text-white-edge-effect');
const textWhiteEdgeSpeedInput = document.getElementById('text-white-edge-speed');
const textWhiteEdgeSpeedReadout = document.getElementById('text-white-edge-speed-readout');
const textRgbEdgeEffectInput = document.getElementById('text-rgb-edge-effect');
const textRgbEdgeSpeedInput = document.getElementById('text-rgb-edge-speed');
const textRgbEdgeSpeedReadout = document.getElementById('text-rgb-edge-speed-readout');
const textRgbEdgeColorInput = document.getElementById('text-rgb-edge-color');
const textConvertBtn = document.getElementById('text-convert-btn');
const textStatus = document.getElementById('text-status');

textFontSizeInput.addEventListener('input', () => {
	textFontSizeReadout.textContent = textFontSizeInput.value;
});

textBrightnessInput.addEventListener('input', () => {
	textBrightnessReadout.textContent = `${Number(textBrightnessInput.value).toFixed(1)}x`;
});

textWhiteEdgeSpeedInput.addEventListener('input', () => {
	textWhiteEdgeSpeedReadout.textContent = textWhiteEdgeSpeedInput.value;
});

textRgbEdgeSpeedInput.addEventListener('input', () => {
	textRgbEdgeSpeedReadout.textContent = textRgbEdgeSpeedInput.value;
});

textConvertBtn.addEventListener('click', async () => {
	const text = textInput.value;
	if (!text.trim()) {
		uiError(textStatus, 'Type some text first.');
		textInput.focus();
		return;
	}
	if (!(await confirmDiscard())) return;

	const notes = [];
	const fps = clampedInput(textFpsInput, 1, 20, 10, 'Frames per second', notes);
	const scrollSpeed = clampedInput(textScrollSpeedInput, 0.5, 20, 3, 'Scroll speed', notes);
	const { frames } = extractFramesFromText({
		text,
		fontSize: Math.max(8, Math.min(64, Number(textFontSizeInput.value) || 30)),
		bold: textBoldInput.checked,
		color: textColorInput.value,
		scrollSpeed,
		bounds: board.bounds,
		brightnessBoost: Number(textBrightnessInput.value) || 1,
		scroll: textScrollInput.checked,
		whiteEdgeEffect: textWhiteEdgeEffectInput.value,
		whiteEdgeSpeed: Number(textWhiteEdgeSpeedInput.value) || 0.05,
		rgbEdgeEffect: textRgbEdgeEffectInput.value,
		rgbEdgeSpeed: Number(textRgbEdgeSpeedInput.value) || 0.08,
		rgbEdgeColor: textRgbEdgeColorInput.value,
	});

	const pattern = newPattern(text.trim().slice(0, 40));
	pattern.fps = fps;
	pattern.frames = frames;
	savePattern(pattern);
	renderPatternList();
	setActivePattern(pattern);

	uiAnnounce(textStatus, [...notes, `Done: ${frames.length} frame${frames.length === 1 ? '' : 's'}.`].join(' '));
});

// --- Pattern / frame editor ---------------------------------------------------

let activePattern = newPattern('Untitled');
let activeFrameIndex = 0;
let playTimer = null;

function currentFrame() {
	return activePattern.frames[activeFrameIndex];
}

function markFrameDirty() {
	renderFrameStrip();
}

function loadFrameIntoBoard() {
	board.setFrame(currentFrame());
	liveStale = true; // the next paint sends the whole frame
}

function setActivePattern(pattern) {
	stopPlayback();
	hideFlashWarning();
	activePattern = pattern;
	activeFrameIndex = 0;
	document.getElementById('pattern-name').value = pattern.name;
	document.getElementById('pattern-fps').value = pattern.fps;
	loadFrameIntoBoard();
	renderFrameStrip();
	renderDeletePattern();
}

document.getElementById('pattern-name').addEventListener('input', (ev) => {
	activePattern.name = ev.target.value;
});
document.getElementById('pattern-fps').addEventListener('input', (ev) => {
	activePattern.fps = Math.max(1, Math.min(20, Number(ev.target.value) || 4));
});

// The editor's animation has changes this browser has not saved: a new
// drawing with anything on it, or a saved one changed since
function activePatternUnsaved() {
	const saved = getPattern(activePattern.id);
	if (!saved) return activePattern.frames.length > 1 || activePattern.frames.some((f) => f.some((v) => v));
	return (
		saved.name !== activePattern.name ||
		saved.fps !== activePattern.fps ||
		JSON.stringify(saved.frames) !== JSON.stringify(activePattern.frames)
	);
}

// Before something replaces the editor's animation: true to go on
async function confirmDiscard() {
	if (!activePatternUnsaved()) return true;
	const name = activePattern.name || 'this animation';
	return uiConfirm(`Your changes to ${name} are not saved in this browser. Discard them?`, {
		title: 'Discard your changes?',
		confirmLabel: 'Discard changes',
		cancelLabel: 'Keep editing',
		danger: true,
	});
}

document.getElementById('new-pattern-btn').addEventListener('click', async () => {
	if (!(await confirmDiscard())) return;
	setActivePattern(newPattern('Untitled'));
	renderPatternList();
});

document.getElementById('save-pattern-btn').addEventListener('click', () => {
	savePattern(activePattern);
	renderPatternList();
	uiAnnounce(null, `Saved ${activePattern.name || 'the animation'} in this browser.`);
});

document.getElementById('duplicate-pattern-btn').addEventListener('click', () => {
	const copy = JSON.parse(JSON.stringify(activePattern));
	copy.id = newPattern('x').id;
	copy.name = `${activePattern.name} copy`;
	savePattern(copy);
	setActivePattern(copy);
	renderPatternList();
	uiAnnounce(null, `Made a copy: ${copy.name}.`);
});

document.getElementById('delete-pattern-btn').addEventListener('click', async () => {
	const pattern = activePattern;
	const sure = await uiConfirm(`Delete ${pattern.name || 'this animation'} from this browser? This can't be undone.`, {
		confirmLabel: 'Delete animation',
		danger: true,
	});
	if (!sure) return;
	deletePattern(pattern.id);
	if (activePattern === pattern) setActivePattern(newPattern('Untitled'));
	renderPatternList();
	uiAnnounce(null, `Deleted ${pattern.name || 'the animation'}.`);
});

document.getElementById('export-pattern-btn').addEventListener('click', () => {
	const blob = new Blob([exportPattern(activePattern)], { type: 'application/json' });
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = `${activePattern.name.replace(/[^\w-]+/g, '_') || 'pattern'}.json`;
	a.click();
	URL.revokeObjectURL(a.href);
});

const importPatternInput = document.getElementById('import-pattern-input');
importPatternInput.addEventListener('change', async (ev) => {
	const file = ev.target.files[0];
	ev.target.value = '';
	if (!file) return;
	try {
		const pattern = importPattern(await file.text());
		if (!(await confirmDiscard())) return;
		savePattern(pattern);
		renderPatternList();
		setActivePattern(pattern);
	} catch (e) {
		uiErrorFor(importPatternInput, `Couldn't open ${file.name}: ${e.message}`);
	}
});

// Delete works on a saved animation only; the line under it says why not
function renderDeletePattern() {
	const saved = !!getPattern(activePattern.id);
	const deleteBtn = document.getElementById('delete-pattern-btn');
	if (!saved && document.activeElement === deleteBtn) document.getElementById('save-pattern-btn').focus();
	deleteBtn.disabled = !saved;
	document.getElementById('saved-reason').hidden = saved;
}

// Rebuilt on every change; the button that had focus gets it back
function renderPatternList() {
	renderDeletePattern();
	const list = document.getElementById('pattern-list');
	const focusedId = list.contains(document.activeElement) ? document.activeElement.dataset.id : undefined;
	list.replaceChildren();
	const patterns = listPatterns().sort((a, b) => b.updatedAt - a.updatedAt);
	if (patterns.length === 0) {
		const li = document.createElement('li');
		li.className = 'empty';
		li.textContent = 'Nothing saved in this browser yet.';
		list.appendChild(li);
		return;
	}
	for (const p of patterns) {
		const li = document.createElement('li');
		li.className = 'pattern-item';
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.dataset.id = p.id;
		btn.textContent = `${p.name} (${p.frames.length} frame${p.frames.length === 1 ? '' : 's'})`;
		if (activePattern.id === p.id) {
			li.classList.add('active');
			btn.setAttribute('aria-current', 'true');
		}
		btn.addEventListener('click', async () => {
			if (activePattern.id === p.id) return;
			if (!(await confirmDiscard())) return;
			setActivePattern(JSON.parse(JSON.stringify(p)));
			renderPatternList();
		});
		li.appendChild(btn);
		list.appendChild(li);
	}
	if (focusedId !== undefined) {
		const again = [...list.querySelectorAll('button')].find((btn) => btn.dataset.id === focusedId);
		if (again) again.focus();
	}
}

// --- Frame strip (per-pattern flipbook editing) ---------------------------------------------------
// Updated in place, so a focused frame keeps focus while you paint or play.

const frameStrip = document.getElementById('frame-strip');
const frameCountLabel = document.getElementById('frame-count-label');

const deleteFrameBtn = document.getElementById('delete-frame-btn');

function selectFrame(index) {
	activeFrameIndex = index;
	loadFrameIntoBoard();
	renderFrameStrip(false);
}

frameStrip.addEventListener('click', (ev) => {
	const btn = ev.target.closest('.frame-thumb');
	if (!btn) return;
	selectFrame(Number(btn.dataset.index));
});

// One Tab stop for the whole strip (roving tabindex, like the tabs): the
// active frame. The arrow keys, Home and End select a frame and move focus.
frameStrip.addEventListener('keydown', (ev) => {
	const btn = ev.target.closest('.frame-thumb');
	if (!btn || ev.altKey || ev.ctrlKey || ev.metaKey) return;
	const i = Number(btn.dataset.index);
	const n = activePattern.frames.length;
	const next = {
		ArrowRight: Math.min(i + 1, n - 1),
		ArrowLeft: Math.max(i - 1, 0),
		Home: 0,
		End: n - 1,
	}[ev.key];
	if (next === undefined) return;
	ev.preventDefault();
	selectFrame(next);
	frameStrip.children[next].focus();
});

// `stats`: the frames may have changed, so redo the size line
function renderFrameStrip(stats = true) {
	if (stats) refreshCompressionStats();
	const n = activePattern.frames.length;
	const focused = frameStrip.contains(document.activeElement) ? Number(document.activeElement.dataset.index) : -1;
	while (frameStrip.children.length > n) frameStrip.lastElementChild.remove();
	while (frameStrip.children.length < n) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'frame-thumb';
		btn.dataset.index = frameStrip.children.length;
		btn.textContent = frameStrip.children.length + 1;
		frameStrip.appendChild(btn);
	}
	for (let i = 0; i < n; i++) {
		const btn = frameStrip.children[i];
		const active = i === activeFrameIndex;
		btn.classList.toggle('active', active);
		btn.tabIndex = active ? 0 : -1;
		const label = `Frame ${i + 1} of ${n}`;
		if (btn.getAttribute('aria-label') !== label) btn.setAttribute('aria-label', label);
		if (active) btn.setAttribute('aria-current', 'step');
		else btn.removeAttribute('aria-current');
	}
	if (focused >= 0 && !frameStrip.contains(document.activeElement) && n) frameStrip.children[Math.min(focused, n - 1)].focus();

	if (n < 2 && playTimer) stopPlayback();
	playBtn.disabled = n < 2;
	deleteFrameBtn.disabled = n < 2;
	const count = `${n} frame${n === 1 ? '' : 's'}`;
	frameCountLabel.textContent = n < 2 ? `${count}. Add a second frame to play.` : count;
}

document.getElementById('add-frame-btn').addEventListener('click', () => {
	activePattern.frames.splice(activeFrameIndex + 1, 0, currentFrame().slice());
	activeFrameIndex++;
	loadFrameIntoBoard();
	renderFrameStrip();
});

deleteFrameBtn.addEventListener('click', () => {
	if (activePattern.frames.length <= 1) return;
	activePattern.frames.splice(activeFrameIndex, 1);
	activeFrameIndex = Math.max(0, activeFrameIndex - 1);
	loadFrameIntoBoard();
	renderFrameStrip();
	// the last frame but one is gone: the button turns off, Add frame takes focus
	if (deleteFrameBtn.disabled) document.getElementById('add-frame-btn').focus();
});

// --- Playback ---------------------------------------------------

const playBtn = document.getElementById('play-btn');
const reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const REDUCED_MOTION_FPS = 3; // the preview's cap when the system asks for less motion

function playbackFps() {
	return reducedMotion && reducedMotion.matches ? Math.min(REDUCED_MOTION_FPS, activePattern.fps) : activePattern.fps;
}

// The glyph is hidden from screen readers, so the name is "Play" or "Stop"
function setPlayButton(playing) {
	const glyph = document.createElement('span');
	glyph.setAttribute('aria-hidden', 'true');
	glyph.textContent = playing ? '■' : '▶';
	playBtn.replaceChildren(glyph, playing ? ' Stop' : ' Play');
}

// WCAG 2.3.1: more than three flashes in one second can cause seizures.
// A flash is a pair of opposite changes in brightness. This counts the
// frame-to-frame changes of the whole board's mean level of at least
// FLASH_STEP that go the other way from the change before.
const FLASH_STEP = 0.1; // of full brightness
const FLASH_MAX_CHANGES = 6; // three flashes

function patternFlashesFast(pattern, fps) {
	const frames = pattern.frames;
	const n = frames.length;
	if (n < 2) return false;
	const means = frames.map((f) => {
		let sum = 0;
		for (const v of f) sum += v;
		return sum / (f.length * 255);
	});
	const second = Math.max(1, Math.round(fps)); // in frames
	// at least two loops and one second past the first loop, so flashes
	// across the loop point and in short loops count too
	const span = Math.max(2 * n, n + second);
	const changes = [];
	let lastSign = 0;
	for (let i = 1; i <= span; i++) {
		const d = means[i % n] - means[(i - 1) % n];
		if (Math.abs(d) < FLASH_STEP) continue;
		const sign = Math.sign(d);
		if (sign !== lastSign) changes.push(i);
		lastSign = sign;
	}
	for (let j = 0, k = 0; j < changes.length; j++) {
		while (changes[k] <= changes[j] - second) k++;
		if (j - k + 1 > FLASH_MAX_CHANGES) return true;
	}
	return false;
}

let flashWarningEl = null;
let flashWarningText = null;
let flashAcceptedFor = null; // the pattern you chose to play anyway

function hideFlashWarning() {
	if (flashWarningEl) flashWarningEl.hidden = true;
}

function showFlashWarning() {
	if (!flashWarningEl) {
		flashWarningEl = document.createElement('div');
		flashWarningEl.id = 'play-flash-warning';
		flashWarningEl.className = 'notice notice-warning';
		flashWarningText = document.createElement('p');
		flashWarningText.id = 'play-flash-warning-text';
		flashWarningText.textContent =
			'This animation flashes fast, which can cause seizures. To make it safe, lower the speed or make ' +
			'neighbouring frames less different. Play anyway?';
		const row = document.createElement('div');
		row.className = 'button-row';
		const anyway = document.createElement('button');
		anyway.type = 'button';
		anyway.className = 'btn';
		anyway.id = 'play-anyway-btn';
		anyway.textContent = 'Play anyway';
		anyway.setAttribute('aria-describedby', flashWarningText.id);
		anyway.addEventListener('click', () => {
			flashAcceptedFor = activePattern;
			hideFlashWarning();
			playBtn.focus();
			startPlayback();
		});
		const dont = document.createElement('button');
		dont.type = 'button';
		dont.className = 'btn';
		dont.id = 'play-dont-btn';
		dont.textContent = "Don't play";
		dont.addEventListener('click', () => {
			hideFlashWarning();
			playBtn.focus();
		});
		row.append(dont, anyway);
		flashWarningEl.append(flashWarningText, row);
		(playBtn.closest('.button-row') || playBtn).insertAdjacentElement('afterend', flashWarningEl);
	}
	flashWarningEl.hidden = false;
	uiAnnounce(null, flashWarningText.textContent);
}

function stopPlayback() {
	if (playTimer) {
		clearInterval(playTimer);
		playTimer = null;
	}
	setPlayButton(false);
}

function startPlayback() {
	if (activePattern.frames.length < 2) return;
	const fps = playbackFps();
	if (flashAcceptedFor !== activePattern && patternFlashesFast(activePattern, fps)) {
		showFlashWarning();
		return;
	}
	hideFlashWarning();
	setPlayButton(true);
	// With Live send on, the badge follows. If the badge is slower than the
	// fps, it skips frames: liveFlush() sends only the newest one.
	playTimer = setInterval(() => {
		activeFrameIndex = (activeFrameIndex + 1) % activePattern.frames.length;
		loadFrameIntoBoard();
		renderFrameStrip(false);
		liveSendFrame();
	}, 1000 / fps);
}

playBtn.addEventListener('click', () => {
	if (playTimer) stopPlayback();
	else startPlayback();
});

// --- Flash storage (compressed .ledanim export/import) ---------------------------------------------------
// The LA04 format: docs/ANIMATION_FORMAT.md, the codec in compression.js.

const compressionQuantSelect = document.getElementById('compression-quant');
const compressionStatsEl = document.getElementById('compression-stats');

// Room for a new item in the badge's store: what the badge reports, or,
// before it has, the whole store (STORE_FLASH_SIZE in flash_pages.h, less
// the settings page and the item header)
const STORE_ITEM_HEADER_BYTES = 32;
let storeStatus = null; // the badge's last status reply
function patternBudgetBytes() {
	const free = storeStatus && storeStatus.freeBytes !== undefined ? storeStatus.freeBytes : 32 * 1024 - 256;
	return Math.max(0, free - STORE_ITEM_HEADER_BYTES);
}

function formatBytes(n) {
	return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
}

// compressPattern() can take seconds, so it runs in a worker
// (compression_worker.js); without workers (a page opened from a file) it
// runs here. The last few results are kept: the same frames, fps and
// brightness levels give the same file.
let compressWorker = null;
try {
	compressWorker = new Worker('compression_worker.js');
} catch (e) {
	compressWorker = null;
}
const compressJobs = new Map(); // job id -> {resolve, reject}
let compressJobId = 0;
if (compressWorker) {
	compressWorker.onmessage = (ev) => {
		const job = compressJobs.get(ev.data.id);
		compressJobs.delete(ev.data.id);
		if (ev.data.error) job.reject(new Error(ev.data.error));
		else job.resolve(ev.data.bytes);
	};
	compressWorker.onerror = (ev) => {
		ev.preventDefault();
		compressWorker = null; // no worker after all: compress here from now on
		for (const job of compressJobs.values()) job.reject(new Error(ev.message || 'the compression worker failed'));
		compressJobs.clear();
	};
}

function patternKey(pattern, quantBits) {
	let h = 0x811c9dc5; // FNV-1a over every value
	for (const frame of pattern.frames) for (const v of frame) h = Math.imul(h ^ v, 0x01000193);
	return `${quantBits}/${pattern.fps}/${pattern.frames.length}/${h >>> 0}`;
}

const compressCache = new Map(); // patternKey -> Promise of the bytes
function compressAsync(pattern, quantBits) {
	const key = patternKey(pattern, quantBits);
	if (compressCache.has(key)) return compressCache.get(key);
	const snapshot = { fps: pattern.fps, frames: pattern.frames }; // postMessage copies it
	const frozen = compressWorker ? null : { fps: pattern.fps, frames: pattern.frames.map((f) => f.slice()) };
	const job = compressWorker
		? new Promise((resolve, reject) => {
			const id = ++compressJobId;
			compressJobs.set(id, { resolve, reject });
			compressWorker.postMessage({ id, pattern: snapshot, quantBits });
		})
		: new Promise((resolve) => setTimeout(resolve, 0)).then(() => compressPattern(frozen, { quantBits }));
	compressCache.set(key, job);
	job.catch(() => compressCache.delete(key));
	while (compressCache.size > 8) compressCache.delete(compressCache.keys().next().value);
	return job;
}

// The size line: one compression at a time; edits made meanwhile are
// compressed when it is done (only the last one)
let statsBusy = false, statsAgain = false;
let statsOverAnnounced = false; // "too big" was said; again only after it fits
async function refreshCompressionStats() {
	if (!activePattern) return;
	if (statsBusy) {
		statsAgain = true;
		return;
	}
	statsBusy = true;
	const pattern = activePattern;
	const frameCount = pattern.frames.length;
	const quantBits = Number(compressionQuantSelect.value);
	const rawBytes = frameCount * MATRIX_ROWS * MATRIX_COLS;
	const pending = compressAsync(pattern, quantBits);
	const frameWord = `${frameCount} frame${frameCount === 1 ? '' : 's'}`;
	const slow = setTimeout(() => (compressionStatsEl.textContent = `${frameWord}: working out the size…`), 150);
	let compressedBytes = null, error = null;
	try {
		compressedBytes = (await pending).byteLength;
	} catch (e) {
		error = e;
	}
	clearTimeout(slow);
	statsBusy = false;
	if (statsAgain) {
		statsAgain = false;
		refreshCompressionStats();
		return;
	}
	if (error) {
		compressionStatsEl.textContent = `Can't work out the size: ${error.message}`;
		return;
	}
	const budgetBytes = patternBudgetBytes();
	const fits = compressedBytes <= budgetBytes;
	compressionStatsEl.textContent = fits
		? `${frameWord} · ${formatBytes(compressedBytes)} · fits (${formatBytes(budgetBytes)} free)`
		: tooBigText(compressedBytes, budgetBytes);
	compressionStatsEl.title = `${formatBytes(rawBytes)} before compression`;
	compressionStatsEl.classList.toggle('stats-over-budget', !fits);
	// not a live region (it changes as you paint): say "too big" once
	if (!fits && !statsOverAnnounced) uiAnnounce(null, compressionStatsEl.textContent);
	statsOverAnnounced = !fits;
}

function tooBigText(bytes, budgetBytes) {
	return `Too big: ${formatBytes(bytes)}, ${formatBytes(budgetBytes)} free. Lower Detail, frames or fps.`;
}

compressionQuantSelect.addEventListener('change', refreshCompressionStats);

const exportCompressedBtn = document.getElementById('export-compressed-btn');
exportCompressedBtn.addEventListener('click', async () => {
	const quantBits = Number(compressionQuantSelect.value);
	const name = activePattern.name;
	let bytes;
	try {
		bytes = await compressAsync(activePattern, quantBits);
	} catch (e) {
		uiErrorFor(exportCompressedBtn, `Couldn't compress this animation: ${e.message}`);
		return;
	}
	const blob = new Blob([bytes], { type: 'application/octet-stream' });
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = `${name.replace(/[^\w-]+/g, '_') || 'pattern'}.ledanim`;
	a.click();
	URL.revokeObjectURL(a.href);
});

const uploadPatternStatusEl = document.getElementById('upload-pattern-status');
const uploadPatternBtn = document.getElementById('upload-pattern-btn');

uploadPatternBtn.addEventListener('click', async () => {
	if (uiIsBusy(uploadPatternBtn)) return;
	if (!device.connected) {
		uiError(uploadPatternStatusEl, 'Connect your badge first.');
		return;
	}
	if (storeUploading) {
		uiError(uploadPatternStatusEl, 'Wait until the badge is done with the last upload.');
		return;
	}
	const quantBits = Number(compressionQuantSelect.value);
	// the badge shows names in capitals
	const name = activePattern.name.trim().toUpperCase() || 'PATTERN';
	uiBusy(uploadPatternBtn, 'Saving…');
	uiAnnounce(uploadPatternStatusEl, 'Compressing…');
	try {
		let bytes;
		try {
			bytes = await compressAsync(activePattern, quantBits);
		} catch (e) {
			uiError(uploadPatternStatusEl, `Couldn't compress this animation: ${e.message}`);
			return;
		}
		const budgetBytes = patternBudgetBytes();
		if (bytes.length > budgetBytes) {
			uiError(uploadPatternStatusEl, tooBigText(bytes.length, budgetBytes));
			return;
		}
		handOverBadge();
		uiAnnounce(uploadPatternStatusEl, `Saving ${formatBytes(bytes.length)}…`);
		storeUploading = true;
		try {
			await device.uploadPattern(bytes, name);
			uiAnnounce(uploadPatternStatusEl, `Saved as ${name} (${formatBytes(bytes.length)}) and playing.`);
		} catch (e) {
			uiError(uploadPatternStatusEl, `Couldn't save to the badge: ${e.message}`);
		} finally {
			storeUploading = false;
		}
		refreshStore();
	} finally {
		uiBusy(uploadPatternBtn, null);
	}
});

const importCompressedInput = document.getElementById('import-compressed-input');
importCompressedInput.addEventListener('change', async (ev) => {
	const file = ev.target.files[0];
	ev.target.value = '';
	if (!file) return;
	try {
		const bytes = new Uint8Array(await file.arrayBuffer());
		const { fps, frames } = decompressPattern(bytes);
		if (!(await confirmDiscard())) return;
		const pattern = newPattern(file.name.replace(/\.[^.]+$/, ''));
		pattern.fps = fps;
		pattern.frames = frames;
		savePattern(pattern);
		renderPatternList();
		setActivePattern(pattern);
	} catch (e) {
		uiErrorFor(importCompressedInput, `Couldn't open ${file.name}: ${e.message}`);
	}
});

// --- On your badge: the item store (store.h) ---------------------------------------------------

const storeListEl = document.getElementById('store-list');
const storeStatusEl = document.getElementById('store-status');
storeStatusEl.tabIndex = -1; // takes focus when the row that had it is gone
let storeItems = []; // [{index, type, length, name}]
let storeBusy = false; // an upload or a listing is going on
// An upload is going on. Only this refuses a second upload: a listing
// can run alongside, webusb.js puts the packets in order.
let storeUploading = false;
let storeNotice = ''; // how the last action went, said before the item count
let storeListKey = null; // the items the rows show now

// The flash an item takes: the header and the payload, in whole pages
// (store.h), which is what the free space counts
const STORE_PAGE_BYTES = 256;
function storeItemBytes(item) {
	return Math.ceil((STORE_ITEM_HEADER_BYTES + item.length) / STORE_PAGE_BYTES) * STORE_PAGE_BYTES;
}

// Row keys that stay the same when the indexes move after a delete
function rowKeys(items, keyOf) {
	const seen = new Map();
	return items.map((item) => {
		const base = keyOf(item);
		const n = seen.get(base) || 0;
		seen.set(base, n + 1);
		return `${base}#${n}`;
	});
}

// Before a list is rebuilt: which row and which of its buttons had focus
function rememberListFocus(listEl) {
	const el = document.activeElement;
	if (!el || !listEl.contains(el) || !el.dataset.action) return null;
	const li = el.closest('li');
	return { key: li.dataset.key, action: el.dataset.action, position: [...listEl.children].indexOf(li) };
}

// After the rebuild: the same button of the same row, else of the row now
// at that place, else `fallback`
function restoreListFocus(listEl, saved, fallback) {
	if (!saved) return;
	const rows = [...listEl.children];
	const row = rows.find((li) => li.dataset.key === saved.key) || rows[Math.min(saved.position, rows.length - 1)];
	const btn = row && row.querySelector(`[data-action="${saved.action}"]`);
	if (btn && !btn.disabled) btn.focus();
	else if (fallback) fallback.focus();
}

function makeIcon(name) {
	const icon = document.createElement('span');
	icon.className = `icon ${name}`;
	icon.setAttribute('aria-hidden', 'true');
	return icon;
}

// A row button; `label` is its accessible name when the visible text
// alone does not say which item it is for. An icon button gets it as
// title only: title is the name then, and the tooltip, without a second
// copy read as the description.
function makeRowButton(action, text, label, icon) {
	const btn = document.createElement('button');
	btn.type = 'button';
	btn.className = icon ? 'btn btn-icon' : 'btn';
	btn.dataset.action = action;
	if (icon) {
		btn.appendChild(makeIcon(icon));
		btn.title = label;
	} else {
		btn.textContent = text;
		btn.setAttribute('aria-label', label);
	}
	return btn;
}

function buildStoreRow(item, key) {
	const name = item.name || '(no name)';
	const li = document.createElement('li');
	li.className = 'store-item';
	li.dataset.key = key;
	// name, under it the type and the flash it takes, then the state pills
	const label = document.createElement('span');
	label.className = 'store-label';
	const nameEl = document.createElement('span');
	nameEl.className = 'store-name';
	nameEl.textContent = name;
	const meta = document.createElement('span');
	meta.className = 'store-meta';
	meta.textContent = `${ITEM_TYPE_NAMES[item.type] ?? 'Type ' + item.type} · ${formatBytes(storeItemBytes(item))}`;
	meta.title = `${formatBytes(item.length)} file; on the badge it takes whole 256-byte pages, with a 32-byte header`;
	const badges = document.createElement('span');
	badges.className = 'store-badges';
	label.append(nameEl, meta, badges);

	const run = makeRowButton('run', 'Start', `Start ${name}`);
	run.addEventListener('click', () => storeAction(() => device.runItem(item.index), { done: `Started ${name}.` }));
	const bootBtn = makeRowButton('boot', '', `Start ${name} at power-on`, 'i-star');
	bootBtn.addEventListener('click', () =>
		storeAction(() => device.runItem(item.index, true), { done: `${name} starts at power-on now.` })
	);
	const del = makeRowButton('delete', '', `Delete ${name}`, 'i-trash');
	del.addEventListener('click', async () => {
		const sure = await uiConfirm(`Delete ${name} from the badge? This can't be undone.`, {
			title: `Delete ${name}`,
			confirmLabel: 'Delete',
			danger: true,
		});
		if (sure) storeAction(() => device.deleteItem(item.index), { done: `Deleted ${name}.` });
	});
	const actions = document.createElement('span');
	actions.className = 'store-actions';
	actions.append(run, bootBtn, del);
	li.append(label, actions);
	return li;
}

// The running and power-on marks: a pill each (not colour alone),
// aria-current on the running row, aria-pressed on the power-on star
function updateStoreRow(li, item) {
	const running = !!storeStatus && item.index === storeStatus.running;
	const boot = !!storeStatus && item.index === storeStatus.boot;
	const marks = `${running}/${boot}`;
	if (li.dataset.marks === marks) return;
	li.dataset.marks = marks;
	li.classList.toggle('running', running);
	if (running) li.setAttribute('aria-current', 'true');
	else li.removeAttribute('aria-current');
	const pills = [];
	if (running) {
		const pill = document.createElement('span');
		pill.className = 'pill pill-playing';
		pill.textContent = 'Playing';
		pills.push(pill);
	}
	if (boot) {
		const pill = document.createElement('span');
		pill.className = 'pill pill-boot';
		pill.append(makeIcon('i-star-filled'), ' Power-on');
		pills.push(pill);
	}
	li.querySelector('.store-badges').replaceChildren(...pills);
	const bootBtn = li.querySelector('[data-action="boot"]');
	bootBtn.setAttribute('aria-pressed', String(boot));
	bootBtn.firstElementChild.className = `icon ${boot ? 'i-star-filled' : 'i-star'}`;
}

function renderStore() {
	renderAppLibrary(); // its Add / Update buttons follow what is stored
	if (!device.connected) {
		storeListEl.replaceChildren();
		storeListKey = null;
		storeNotice = '';
		uiAnnounce(storeStatusEl, 'Connect your badge to see what is on it.');
		return;
	}
	// Rebuild the rows only when the items changed; the once-a-second
	// running and power-on marks are updated in place, so focus stays put
	const keys = rowKeys(storeItems, (item) => `${item.type}:${item.name}`);
	const listKey = JSON.stringify(storeItems.map((item, i) => [keys[i], item.index, item.length]));
	if (listKey !== storeListKey) {
		const saved = rememberListFocus(storeListEl);
		storeListEl.replaceChildren(...storeItems.map((item, i) => buildStoreRow(item, keys[i])));
		storeListKey = listKey;
		restoreListFocus(storeListEl, saved, storeStatusEl);
	}
	storeItems.forEach((item, i) => updateStoreRow(storeListEl.children[i], item));

	if (uiHasError(storeStatusEl)) return; // it stays until the next action
	let summary = '';
	if (storeStatus && storeStatus.freeBytes !== undefined) {
		const used = storeItems.reduce((sum, item) => sum + storeItemBytes(item), 0);
		summary =
			`${storeItems.length} item${storeItems.length === 1 ? '' : 's'}, ` +
			`${formatBytes(used)} used, ${formatBytes(storeStatus.freeBytes)} free.`;
	} else if (storeStatus) {
		summary = "This firmware can't store items. Update the badge firmware.";
	}
	uiAnnounce(storeStatusEl, storeNotice ? `${storeNotice} ${summary}` : summary);
}

async function refreshStore() {
	if (!device.connected || storeBusy) return;
	storeBusy = true;
	try {
		const { status, items } = await device.listItems();
		storeStatus = status;
		storeItems = items;
	} catch (e) {
		uiError(storeStatusEl, `Couldn't read what is on the badge: ${e.message}`);
	} finally {
		storeBusy = false;
	}
	renderStore();
	refreshCompressionStats();
}

// The once-a-second status: re-read the list when it changed size, else
// just move the running and boot marks.
function storeStatusChanged(status) {
	const changed = !storeStatus || status.count !== storeStatus.count;
	const marks = !storeStatus || status.running !== storeStatus.running || status.boot !== storeStatus.boot;
	if (storeBusy) return;
	storeStatus = status;
	// changed on the badge, or by live drawing: the notice is out of date
	if (changed || marks) storeNotice = '';
	if (changed && status.count !== undefined) refreshStore();
	else if (marks) renderStore();
}

// The badge shows something else now: the editor stops sending to it,
// and the last action's notice in #store-status is out of date
function handOverBadge() {
	stopPlayback();
	liveCancel();
	storeNotice = '';
}

// Runs a store command. Errors show in `statusEl`; `done` says how it went.
async function storeAction(action, { statusEl = storeStatusEl, done = '' } = {}) {
	if (!device.connected) {
		uiError(statusEl, 'Connect your badge first.');
		return false;
	}
	handOverBadge();
	if (uiHasError(statusEl)) uiAnnounce(statusEl, '');
	let ok = true;
	try {
		await action();
		if (statusEl === storeStatusEl) storeNotice = done;
		else if (done) uiAnnounce(statusEl, done);
	} catch (e) {
		ok = false;
		uiError(statusEl, e.message);
	}
	await refreshStore();
	return ok;
}

document.getElementById('store-add-input').addEventListener('change', async (ev) => {
	const file = ev.target.files[0];
	ev.target.value = '';
	if (!file) return;
	if (!device.connected) {
		uiError(storeStatusEl, 'Connect your badge first.');
		return;
	}
	if (storeUploading) {
		uiError(storeStatusEl, 'Wait until the badge is done with the last upload.');
		return;
	}
	const bytes = new Uint8Array(await file.arrayBuffer());
	const magic = new TextDecoder().decode(bytes.subarray(0, 4));
	const name = file.name.replace(/\.[^.]+$/, '').toUpperCase();
	if (/\.txt$/i.test(file.name)) {
		let text;
		try {
			text = makeTextItem(new TextDecoder().decode(bytes));
		} catch (e) {
			uiError(storeStatusEl, `Couldn't add ${file.name}: ${e.message}`);
			return;
		}
		await addToBadge(ITEM_TYPE.TEXT, name, text);
		return;
	}
	const type = magic === 'HHAP' ? ITEM_TYPE.APP : magic === 'LA04' ? ITEM_TYPE.ANIMATION : 0;
	if (!type) {
		uiError(storeStatusEl, `${file.name} is not an app (.hhapp), an animation (.ledanim) or a text (.txt).`);
		return;
	}
	await addToBadge(type, name, bytes);
});

// A text item (text_item.js): the badge draws the text in its own font
const textItemInput = document.getElementById('text-item-input');
const textItemStatus = document.getElementById('text-item-status');
const textItemCount = document.getElementById('text-item-count');
const textItemBtn = document.getElementById('text-item-btn');
let textItemOver = false; // "too long" was said; again only after it fits
// The count is not a live region (it changes on every key); the textarea
// points to it. Going over the limit is said once.
function textItemCheck() {
	const ascii = textItemAscii(textItemInput.value);
	const room = patternBudgetBytes() - TEXT_ITEM.HEADER_BYTES;
	const n = ascii ? ascii.length : 0;
	const over = n > room;
	const text = n ? `${n} character${n === 1 ? '' : 's'}${over ? `, ${room} fit on the badge now` : ''}.` : '';
	if (textItemCount.textContent !== text) textItemCount.textContent = text;
	if (over && !textItemOver) uiAnnounce(null, text);
	textItemOver = over;
	if (uiHasError(textItemStatus)) uiAnnounce(textItemStatus, '');
	return ascii;
}
textItemInput.addEventListener('input', textItemCheck);
textItemBtn.addEventListener('click', async () => {
	if (uiIsBusy(textItemBtn)) return;
	if (!device.connected) {
		uiError(textItemStatus, 'Connect your badge first.');
		return;
	}
	if (storeUploading) {
		uiError(textItemStatus, 'Wait until the badge is done with the last upload.');
		return;
	}
	let bytes;
	try {
		bytes = makeTextItem(textItemInput.value, {
			speed: document.getElementById('text-item-speed').value,
			style: document.getElementById('text-item-plain').checked ? TEXT_ITEM.STYLE.PLAIN : TEXT_ITEM.STYLE.NAMETAG,
		});
	} catch (e) {
		uiError(textItemStatus, e.message);
		return;
	}
	uiBusy(textItemBtn, 'Adding…');
	const ok = await addToBadge(ITEM_TYPE.TEXT, textItemName(textItemInput.value), bytes, null, {
		statusEl: textItemStatus,
		button: textItemBtn,
	});
	uiBusy(textItemBtn, null);
	if (ok) uiAnnounce(textItemStatus, 'Added and playing.');
});

// Stores an item on the badge (it starts at once). If `replace` is the
// index of an older copy, that one is deleted afterwards: the new item
// went in after it, so its index is still right.
// Progress shows in `statusEl` (throttled for screen readers) and on
// `button`; an error goes to `onError`, by default `statusEl`.
// Resolves true when the item is stored.
async function addToBadge(type, name, bytes, replace = null, options = {}) {
	const { statusEl = storeStatusEl, button = null } = options;
	const onError = options.onError || ((message) => uiError(statusEl, message));
	const verb = replace === null ? 'Adding' : 'Updating';
	handOverBadge();
	storeBusy = true;
	storeUploading = true;
	let ok = false;
	try {
		uiAnnounce(statusEl, `${verb} ${name}…`);
		await device.storeItem(type, name, bytes, (sent, total) => {
			const pct = Math.round((100 * sent) / total);
			if (button) uiBusy(button, `${verb}… ${pct}%`);
			uiAnnounce(statusEl, `${verb} ${name}: ${pct}%`, { throttleMs: 2000, percent: pct });
		});
		if (replace !== null) await device.deleteItem(replace);
		ok = true;
		storeNotice = `${replace === null ? 'Added' : 'Updated'} ${name}. It is playing now.`;
		if (statusEl !== storeStatusEl) uiAnnounce(statusEl, '');
	} catch (e) {
		// firmware from before text items refuses the type
		if (type === ITEM_TYPE.TEXT && e.result === 1)
			onError("The badge's firmware does not know text items yet. Update it under Firmware first.");
		else onError(`Couldn't add ${name}: ${e.message}`);
	} finally {
		storeBusy = false;
		storeUploading = false;
		if (button) uiBusy(button, null);
	}
	await refreshStore();
	return ok;
}

// --- App library: the apps that come with the firmware (webui/apps/, made
// by `make -C apps webui`) ---------------------------------------------------

// var, not let: renderStore() may run before this part of the file has
var appLibrary = []; // [{name, file, bytes, api, description, recommended}]
var appRecommended = []; // the names of the recommended set, in install order (apps/recommended.txt)
var appListKey = null; // what the rows show now

// Why Add can't be used now, shown as text (a disabled button can't take
// focus, so a tooltip on it never reaches keyboard users)
function appLibraryReason() {
	if (!device.connected) return 'Connect your badge to add apps.';
	const api = storeStatus && storeStatus.api;
	if (api === undefined || api === null) return '';
	const tooOld = appLibrary.filter((app) => api < app.api).length;
	if (tooOld && tooOld === appLibrary.length) return 'Update the badge firmware to add apps.';
	if (tooOld) return 'Some apps need newer badge firmware. Update the firmware to add them.';
	return '';
}

function buildAppRow({ app, old, disabled }) {
	const appLibraryEl = document.getElementById('app-library');
	const li = document.createElement('li');
	li.className = 'store-item';
	li.dataset.key = app.name;
	const label = document.createElement('span');
	label.className = 'store-label';
	const name = document.createElement('span');
	name.className = 'store-name';
	name.textContent = app.name;
	label.appendChild(name);
	if (app.description) {
		// one line: the first sentence; the whole text as a tooltip
		const description = document.createElement('span');
		description.className = 'store-meta store-desc';
		const first = app.description.match(/^.*?[.!?](?=\s|$)/);
		description.textContent = first ? first[0] : app.description;
		if (description.textContent !== app.description) description.title = app.description;
		label.appendChild(description);
	}
	const meta = document.createElement('span');
	meta.className = 'store-meta';
	meta.textContent = `App · ${formatBytes(storeItemBytes({ length: app.bytes }))}${app.recommended ? ' · recommended' : ''}`;
	label.appendChild(meta);

	const verb = old ? 'Update' : 'Add';
	const btn = makeRowButton('add', verb, `${verb} ${app.name}`);
	if (disabled) {
		btn.disabled = true;
		if (document.getElementById('app-library-reason')) btn.setAttribute('aria-describedby', 'app-library-reason');
	}
	btn.addEventListener('click', async () => {
		if (uiIsBusy(btn)) return;
		const showError = (message) => uiErrorFor(appLibraryEl, message);
		if (storeUploading) {
			showError('Wait until the badge is done with the last upload.');
			return;
		}
		uiBusy(btn, `${old ? 'Updating' : 'Adding'}…`);
		try {
			const r = await fetch(`apps/${app.file}`, { cache: 'no-store' });
			if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
			const bytes = new Uint8Array(await r.arrayBuffer());
			if (new TextDecoder().decode(bytes.subarray(0, 4)) !== 'HHAP') throw new Error('not an app');
			await addToBadge(ITEM_TYPE.APP, app.name, bytes, old ? old.index : null, { button: btn, onError: showError });
		} catch (e) {
			showError(`Couldn't add ${app.name}: ${e.message}`);
		} finally {
			uiBusy(btn, null);
		}
	});
	li.append(label, btn);
	return li;
}

function renderAppLibrary() {
	const appLibraryEl = document.getElementById('app-library');
	const reasonEl = document.getElementById('app-library-reason');
	const reason = appLibraryReason();
	if (reasonEl) {
		if (reasonEl.textContent !== reason) reasonEl.textContent = reason;
		reasonEl.hidden = !reason;
	}
	const api = storeStatus && storeStatus.api;
	const rows = appLibrary.map((app) => ({
		app,
		old: storeItems.find((item) => item.type === ITEM_TYPE.APP && item.name === app.name),
		disabled: !device.connected || (api !== undefined && api !== null && api < app.api),
	}));
	// Rebuild only when a button changes; focus goes back to the same app
	const key = JSON.stringify(rows.map((row) => [row.app.name, row.old ? row.old.index : null, row.disabled]));
	if (key !== appListKey) {
		const saved = rememberListFocus(appLibraryEl);
		appLibraryEl.replaceChildren(...rows.map(buildAppRow));
		if (!appLibrary.length) {
			const li = document.createElement('li');
			li.className = 'hint';
			li.textContent = 'No apps found (make -C apps webui).';
			appLibraryEl.appendChild(li);
		}
		appListKey = key;
		restoreListFocus(appLibraryEl, saved, null);
	}
	renderRecommended();
}

// The recommended set: erase the badge, then install the apps it ships with
function renderRecommended() {
	const btn = document.getElementById('app-recommended-btn');
	const hint = document.getElementById('app-recommended-hint');
	const apps = appRecommended.map((n) => appLibrary.find((a) => a.name === n)).filter(Boolean);
	const bytes = apps.reduce((sum, a) => sum + storeItemBytes({ length: a.bytes }), 0);
	const api = storeStatus && storeStatus.api;
	const needs = Math.max(0, ...apps.map((a) => a.api));
	const tooOld = api !== undefined && api !== null && api < needs;
	if (!uiIsBusy(btn)) btn.disabled = !apps.length || !device.connected || tooOld;
	btn.removeAttribute('title');
	// why the button is off, next to it (the list's reason is far above)
	const reasonEl = document.getElementById('app-recommended-reason');
	let reason = '';
	if (apps.length && !device.connected) reason = 'Connect your badge to install the recommended apps.';
	else if (apps.length && tooOld) reason = 'Update the badge firmware to install the recommended apps.';
	if (reasonEl) {
		if (reasonEl.textContent !== reason) reasonEl.textContent = reason;
		reasonEl.hidden = !reason;
	}
	const describedBy = [];
	if (reason && reasonEl) describedBy.push('app-recommended-reason');
	if (hint) describedBy.push('app-recommended-hint');
	if (describedBy.length) btn.setAttribute('aria-describedby', describedBy.join(' '));
	else btn.removeAttribute('aria-describedby');
	if (hint) {
		const text = apps.length ? `${apps.length} apps, ${formatBytes(bytes)}: ${apps.map((a) => a.name).join(', ')}.` : '';
		if (hint.textContent !== text) hint.textContent = text;
	}
}

async function installRecommended() {
	const btn = document.getElementById('app-recommended-btn');
	if (uiIsBusy(btn)) return;
	if (!device.connected) {
		uiErrorFor(btn, 'Connect your badge first.');
		return;
	}
	if (storeUploading) {
		uiErrorFor(btn, 'Wait until the badge is done with the last upload.');
		return;
	}
	const apps = appRecommended.map((n) => appLibrary.find((a) => a.name === n)).filter(Boolean);
	const sure = await uiConfirm(
		`Erase every app, animation and text on the badge, then install the ${apps.length} recommended apps? ` +
			"Your name and the apps' saved data, such as high scores, stay.",
		{ title: 'Install the recommended apps', confirmLabel: 'Erase and install', danger: true }
	);
	if (!sure) return;
	handOverBadge();
	storeBusy = true;
	storeUploading = true;
	uiBusy(btn, 'Downloading…');
	try {
		// every download first, so a failed one erases nothing
		const files = [];
		for (const app of apps) {
			const r = await fetch(`apps/${app.file}`, { cache: 'no-store' });
			if (!r.ok) throw new Error(`${app.name}: ${r.status} ${r.statusText}`);
			files.push([app, new Uint8Array(await r.arrayBuffer())]);
		}
		uiBusy(btn, 'Erasing…');
		uiAnnounce(storeStatusEl, 'Erasing the badge…');
		await device.eraseStore();
		for (let i = 0; i < files.length; i++) {
			const [app, bytes] = files[i];
			uiBusy(btn, `Installing ${i + 1} of ${files.length}…`);
			await device.storeItem(ITEM_TYPE.APP, app.name, bytes, (sent, total) => {
				const pct = Math.round((100 * sent) / total);
				uiAnnounce(storeStatusEl, `Installing ${i + 1} of ${files.length}, ${app.name}: ${pct}%`, {
					throttleMs: 2000,
					percent: (100 * (i + sent / total)) / files.length,
				});
			});
		}
		storeNotice = `Installed ${files.length} recommended apps.`;
	} catch (e) {
		uiErrorFor(btn, `The recommended apps did not install completely: ${e.message}`);
	} finally {
		storeBusy = false;
		storeUploading = false;
		uiBusy(btn, null);
	}
	await refreshStore();
}

document.getElementById('app-recommended-btn').addEventListener('click', installRecommended);

fetch('apps/index.json', { cache: 'no-store' })
	.then((r) => (r.ok ? r.json() : { apps: [] }))
	.then((index) => {
		appLibrary = index.apps || [];
		appRecommended = index.recommended || [];
		renderAppLibrary();
	})
	.catch(() => renderAppLibrary());

document.getElementById('store-stop-btn').addEventListener('click', () =>
	storeAction(() => device.stop(), { done: 'Stopped.' })
);

document.getElementById('store-erase-btn').addEventListener('click', async () => {
	const sure = await uiConfirm("Erase every app, animation and text on the badge? This can't be undone.", {
		title: 'Erase the badge',
		confirmLabel: 'Erase all items',
		danger: true,
	});
	if (sure) storeAction(() => device.eraseStore(), { done: 'Erased all items.' });
});

const badgeNameInput = document.getElementById('badge-name');
const badgeNameStatus = document.getElementById('badge-name-status') || storeStatusEl;

document.getElementById('badge-name-btn').addEventListener('click', () =>
	storeAction(
		async () => {
			badgeNameInput.value = await device.setName(badgeNameInput.value.trim());
		},
		{ statusEl: badgeNameStatus, done: 'Name saved.' }
	)
);

device.addEventListener('connect', async () => {
	try {
		badgeNameInput.value = await device.getName();
	} catch (e) {
		/* firmware without persistent settings */
	}
	refreshStore();
});
device.addEventListener('disconnect', () => {
	storeStatus = null;
	storeItems = [];
	badgeNameInput.value = '';
	if (badgeNameStatus !== storeStatusEl) uiAnnounce(badgeNameStatus, '');
	renderStore();
	refreshCompressionStats(); // the free space is the whole store again
});

// --- Init ---------------------------------------------------

// version.json is written by tools/deploy_webui.sh: which commit this page is
fetch('version.json', { cache: 'no-store' })
	.then((r) => (r.ok ? r.json() : null))
	.then((v) => {
		if (v) document.getElementById('webui-version').textContent = `· web interface ${v.commit} (${v.date})`;
	})
	.catch(() => {});

renderPatternList();
renderFrameStrip();
loadFrameIntoBoard();
