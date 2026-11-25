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

function currentBrushLevel() {
	return eraseToggle.checked ? 0 : Number(brushValueInput.value);
}

function currentBrushColor() {
	return eraseToggle.checked ? [0, 0, 0] : hexToRgbChannels(brushColorInput.value);
}

function hexToRgbChannels(hex) {
	return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

brushValueInput.addEventListener('input', () => {
	brushValueReadout.textContent = brushValueInput.value;
});

// "White LEDs" paints a brightness onto the mono LEDs, "RGB LEDs" paints a
// color onto the RGB accent LEDs -- each mode only touches its own LEDs.
brushTargetInput.addEventListener('change', () => {
	const rgb = brushTargetInput.value === 'rgb';
	board.rgbBrush = rgb;
	board.container.classList.toggle('rgb-brush', rgb);
	document.getElementById('brush-brightness-control').hidden = rgb;
	document.getElementById('brush-color-control').hidden = !rgb;
});

board.onPaintAt = (xmm, ymm) => {
	const radius = Number(brushRadiusInput.value);
	const pickRadius = Math.max(radius, 1.6); // always usable even at radius 0
	let touched = false;
	if (board.rgbBrush) {
		const [r, g, b] = currentBrushColor();
		for (const led of BOARD_DATA.rgb_leds) {
			if (Math.hypot(led.x - xmm, led.y - ymm) > pickRadius) continue;
			const [cr, cg, cb] = board.getRgb(led);
			if (cr === r && cg === g && cb === b) continue; // don't resend while dragging over it
			setRgbChannels(led, r, g, b);
			touched = true;
		}
	} else {
		const level = currentBrushLevel();
		for (const led of BOARD_DATA.leds) {
			if (Math.hypot(led.x - xmm, led.y - ymm) <= pickRadius) {
				paintPixel(led.row, led.col, level);
				touched = true;
			}
		}
	}
	if (touched) markFrameDirty();
};

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

board.onSelectRgb = (led) => {
	selectedRgbLed = led;
	rgbEditorLabel.textContent = led.ref;
	rgbColorInput.value = rgbToHex(...board.getRgb(led));
	rgbEditor.hidden = false;
};

rgbColorInput.addEventListener('input', () => {
	if (!selectedRgbLed) return;
	paintRgb(selectedRgbLed, ...hexToRgbChannels(rgbColorInput.value));
});

document.getElementById('rgb-editor-off-btn').addEventListener('click', () => {
	if (!selectedRgbLed) return;
	paintRgb(selectedRgbLed, 0, 0, 0);
	rgbColorInput.value = '#000000';
});

document.getElementById('rgb-editor-close-btn').addEventListener('click', () => {
	rgbEditor.hidden = true;
	selectedRgbLed = null;
});

// --- Device connection ---------------------------------------------------

const connectBtn = document.getElementById('connect-btn');
const emuBtn = document.getElementById('emu-btn');
let emulatorHere = false; // tools/emu/emu.py --web serves this page
const disconnectBtn = document.getElementById('disconnect-btn');
const connStatusEl = document.getElementById('conn-status');
const deviceModeEl = document.getElementById('device-mode');

function webUsbAvailable() {
	return typeof navigator !== 'undefined' && !!navigator.usb;
}

function refreshConnButtons() {
	connectBtn.hidden = device.connected;
	emuBtn.hidden = device.connected || !emulatorHere;
	disconnectBtn.hidden = !device.connected;
	connStatusEl.textContent = device.connected ? (device.emulator ? 'Connected to the emulator' : 'Connected') : 'Not connected';
	connStatusEl.classList.toggle('connected', device.connected);
}

connectBtn.addEventListener('click', async () => {
	try {
		await device.requestAndOpen();
	} catch (e) {
		if (e.name !== 'NotFoundError') alert(`Couldn't connect: ${e.message}`);
	}
});
disconnectBtn.addEventListener('click', () => device.disconnect());
emuBtn.addEventListener('click', () => device.connectEmulator().catch((e) => alert(e.message)));
LedMatrixDevice.emulatorPresent().then((here) => {
	emulatorHere = here;
	refreshConnButtons();
});
device.addEventListener('connect', refreshConnButtons);
device.addEventListener('disconnect', refreshConnButtons);
// Must match APP_MODE_* in the firmware's webusb_protocol.h
const DEVICE_MODE_NAMES = { 1: 'Custom frame', 2: 'Stored animation or text', 3: 'App', 4: 'Name tag' };
const MODE_CUSTOM = 1;

device.addEventListener('status', (ev) => {
	const { mode, brightness } = ev.detail;
	badgeMode = mode;
	const name = DEVICE_MODE_NAMES[mode] ?? `Mode ${mode}`;
	deviceModeEl.textContent = `${name}, brightness ${brightness}`;
	const old = ev.detail.api !== undefined && ev.detail.api < FIRMWARE_API;
	deviceModeEl.classList.toggle('stats-over-budget', old);
	if (old) deviceModeEl.textContent += ` -- the badge's firmware is older than this page (API ${ev.detail.api}, needs ${FIRMWARE_API}): update it`;
	storeStatusChanged(ev.detail);
});

if (!webUsbAvailable()) {
	connectBtn.disabled = true;
	connStatusEl.textContent = 'WebUSB not available in this browser';
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

document.getElementById('send-frame-btn').addEventListener('click', () => {
	if (!device.connected) {
		alert('Connect to a device first.');
		return;
	}
	stopPlayback();
	liveSendFrame();
	if (!liveSendOn()) device.uploadFrame(Uint8Array.from(currentFrame()));
});

// --- Create animation tabs ---------------------------------------------------

const animationTabs = document.querySelectorAll('.tab-bar [role="tab"]');

function selectAnimationTab(selected) {
	for (const tab of animationTabs) {
		const isSelected = tab === selected;
		tab.setAttribute('aria-selected', String(isSelected));
		document.getElementById(tab.getAttribute('aria-controls')).hidden = !isSelected;
	}
}

for (const tab of animationTabs) {
	tab.addEventListener('click', () => selectAnimationTab(tab));
}

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
	for (let i = 0; i < 4; i++) {
		frames.push(withGreen(blank(), 255));
		frames.push(blank());
		frames.push(withWhite(blank(), 255));
		frames.push(blank());
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
	for (let i = 0; i < 6; i++) {
		const frame = withWhite(blank(), 255);
		withGreen(frame, 255);
		frames.push(frame);
		frames.push(blank());
	}

	const pattern = newPattern('Techno pharmacy sign (test)');
	pattern.fps = 12;
	pattern.frames = frames;
	return pattern;
}

document.getElementById('pharmacy-sign-btn').addEventListener('click', () => {
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

videoConvertBtn.addEventListener('click', async () => {
	const file = videoFileInput.files[0];
	if (!file) {
		alert('Choose a video file first.');
		return;
	}

	videoConversionAborted = false;
	videoConvertBtn.hidden = true;
	videoCancelBtn.hidden = false;
	videoProgress.hidden = false;
	videoProgress.value = 0;
	videoStatus.textContent = 'Loading video...';

	try {
		const { frames } = await extractFramesFromVideo(
			file,
			{
				fps: Math.max(1, Math.min(20, Number(videoFpsInput.value) || 8)),
				startTime: Math.max(0, Number(videoStartInput.value) || 0),
				duration: Math.max(0.1, Number(videoDurationInput.value) || 5),
				bounds: board.bounds,
				brightnessBoost: Number(videoBrightnessInput.value) || 1,
				ambilight: videoAmbilightInput.checked,
			},
			(done, total) => {
				videoProgress.value = done / total;
				videoStatus.textContent = `Extracting frame ${done} / ${total}...`;
			},
			() => videoConversionAborted
		);

		if (videoConversionAborted) {
			videoStatus.textContent = 'Cancelled.';
			return;
		}

		const pattern = newPattern(file.name.replace(/\.[^.]+$/, ''));
		pattern.fps = Math.max(1, Math.min(20, Number(videoFpsInput.value) || 8));
		pattern.frames = frames;
		savePattern(pattern);
		renderPatternList();
		setActivePattern(pattern);

		videoStatus.textContent = `Done -- ${frames.length} frames.`;
	} catch (e) {
		videoStatus.textContent = `Failed: ${e.message}`;
	} finally {
		videoConvertBtn.hidden = false;
		videoCancelBtn.hidden = true;
		videoProgress.hidden = true;
	}
});

videoCancelBtn.addEventListener('click', () => {
	videoConversionAborted = true;
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

textConvertBtn.addEventListener('click', () => {
	const text = textInput.value;
	if (!text.trim()) {
		alert('Type some text first.');
		return;
	}

	const { frames } = extractFramesFromText({
		text,
		fontSize: Math.max(8, Math.min(64, Number(textFontSizeInput.value) || 30)),
		bold: textBoldInput.checked,
		color: textColorInput.value,
		scrollSpeed: Math.max(0.5, Math.min(20, Number(textScrollSpeedInput.value) || 3)),
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
	pattern.fps = Math.max(1, Math.min(20, Number(textFpsInput.value) || 10));
	pattern.frames = frames;
	savePattern(pattern);
	renderPatternList();
	setActivePattern(pattern);

	textStatus.textContent = `Done -- ${frames.length} frame${frames.length === 1 ? '' : 's'}.`;
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
	activePattern = pattern;
	activeFrameIndex = 0;
	document.getElementById('pattern-name').value = pattern.name;
	document.getElementById('pattern-fps').value = pattern.fps;
	loadFrameIntoBoard();
	renderFrameStrip();
}

document.getElementById('pattern-name').addEventListener('input', (ev) => {
	activePattern.name = ev.target.value;
});
document.getElementById('pattern-fps').addEventListener('input', (ev) => {
	activePattern.fps = Math.max(1, Math.min(20, Number(ev.target.value) || 4));
});

document.getElementById('new-pattern-btn').addEventListener('click', () => {
	setActivePattern(newPattern('Untitled'));
});

document.getElementById('save-pattern-btn').addEventListener('click', () => {
	savePattern(activePattern);
	renderPatternList();
});

document.getElementById('duplicate-pattern-btn').addEventListener('click', () => {
	const copy = JSON.parse(JSON.stringify(activePattern));
	copy.id = newPattern('x').id;
	copy.name = `${activePattern.name} copy`;
	savePattern(copy);
	setActivePattern(copy);
	renderPatternList();
});

document.getElementById('delete-pattern-btn').addEventListener('click', () => {
	if (!confirm(`Delete "${activePattern.name}"? This can't be undone.`)) return;
	deletePattern(activePattern.id);
	renderPatternList();
	setActivePattern(newPattern('Untitled'));
});

document.getElementById('export-pattern-btn').addEventListener('click', () => {
	const blob = new Blob([exportPattern(activePattern)], { type: 'application/json' });
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = `${activePattern.name.replace(/[^\w-]+/g, '_') || 'pattern'}.json`;
	a.click();
	URL.revokeObjectURL(a.href);
});

document.getElementById('import-pattern-input').addEventListener('change', async (ev) => {
	const file = ev.target.files[0];
	ev.target.value = '';
	if (!file) return;
	try {
		const pattern = importPattern(await file.text());
		savePattern(pattern);
		renderPatternList();
		setActivePattern(pattern);
	} catch (e) {
		alert(`Couldn't import that file: ${e.message}`);
	}
});

function renderPatternList() {
	const list = document.getElementById('pattern-list');
	list.innerHTML = '';
	const patterns = listPatterns().sort((a, b) => b.updatedAt - a.updatedAt);
	if (patterns.length === 0) {
		list.innerHTML = '<li class="empty">No saved patterns yet.</li>';
		return;
	}
	for (const p of patterns) {
		const li = document.createElement('li');
		li.className = 'pattern-item';
		if (activePattern.id === p.id) li.classList.add('active');
		const btn = document.createElement('button');
		btn.textContent = `${p.name} (${p.frames.length} frame${p.frames.length === 1 ? '' : 's'})`;
		btn.addEventListener('click', () => {
			setActivePattern(JSON.parse(JSON.stringify(p)));
			renderPatternList();
		});
		li.appendChild(btn);
		list.appendChild(li);
	}
}

// --- Frame strip (per-pattern flipbook editing) ---------------------------------------------------

function renderFrameStrip() {
	refreshCompressionStats();
	const strip = document.getElementById('frame-strip');
	strip.innerHTML = '';
	activePattern.frames.forEach((_, i) => {
		const btn = document.createElement('button');
		btn.className = 'frame-thumb';
		btn.textContent = i + 1;
		if (i === activeFrameIndex) btn.classList.add('active');
		btn.addEventListener('click', () => {
			activeFrameIndex = i;
			loadFrameIntoBoard();
			renderFrameStrip();
		});
		strip.appendChild(btn);
	});
	document.getElementById('frame-count-label').textContent =
		`${activePattern.frames.length} frame${activePattern.frames.length === 1 ? '' : 's'}`;
}

document.getElementById('add-frame-btn').addEventListener('click', () => {
	activePattern.frames.splice(activeFrameIndex + 1, 0, currentFrame().slice());
	activeFrameIndex++;
	loadFrameIntoBoard();
	renderFrameStrip();
});

document.getElementById('delete-frame-btn').addEventListener('click', () => {
	if (activePattern.frames.length <= 1) return;
	activePattern.frames.splice(activeFrameIndex, 1);
	activeFrameIndex = Math.max(0, activeFrameIndex - 1);
	loadFrameIntoBoard();
	renderFrameStrip();
});

// --- Playback ---------------------------------------------------

const playBtn = document.getElementById('play-btn');

function stopPlayback() {
	if (playTimer) {
		clearInterval(playTimer);
		playTimer = null;
	}
	playBtn.textContent = '▶ Play';
}

function startPlayback() {
	if (activePattern.frames.length < 2) return;
	playBtn.textContent = '■ Stop';
	// With Live send on, the badge follows. If the badge is slower than the
	// fps, it skips frames: liveFlush() sends only the newest one.
	playTimer = setInterval(() => {
		activeFrameIndex = (activeFrameIndex + 1) % activePattern.frames.length;
		loadFrameIntoBoard();
		renderFrameStrip();
		liveSendFrame();
	}, 1000 / activePattern.fps);
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
	const slow = setTimeout(() => (compressionStatsEl.textContent = `${frameCount} frames: compressing...`), 150);
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
		compressionStatsEl.textContent = `Can't estimate: ${error.message}`;
		return;
	}
	const budgetBytes = patternBudgetBytes();
	const pct = rawBytes ? Math.round((100 * compressedBytes) / rawBytes) : 0;
	const fits = compressedBytes <= budgetBytes;
	const overBy = compressedBytes - budgetBytes;
	compressionStatsEl.textContent = fits
		? `${frameCount} frames: ${formatBytes(compressedBytes)} compressed ` +
		  `(${pct}% of ${formatBytes(rawBytes)} raw) -- fits the ${formatBytes(budgetBytes)} budget.`
		: `${frameCount} frames: ${formatBytes(compressedBytes)} compressed ` +
		  `(${pct}% of ${formatBytes(rawBytes)} raw) -- ${formatBytes(overBy)} over the ` +
		  `${formatBytes(budgetBytes)} budget. Lower the brightness levels, trim frames, or drop the fps.`;
	compressionStatsEl.classList.toggle('stats-over-budget', !fits);
}

compressionQuantSelect.addEventListener('change', refreshCompressionStats);

document.getElementById('export-compressed-btn').addEventListener('click', async () => {
	const quantBits = Number(compressionQuantSelect.value);
	const name = activePattern.name;
	let bytes;
	try {
		bytes = await compressAsync(activePattern, quantBits);
	} catch (e) {
		alert(`Couldn't compress this pattern: ${e.message}`);
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

document.getElementById('upload-pattern-btn').addEventListener('click', async () => {
	if (!device.connected) {
		alert('Connect to a device first.');
		return;
	}
	const quantBits = Number(compressionQuantSelect.value);
	const name = activePattern.name.toUpperCase() || 'PATTERN';
	uploadPatternStatusEl.textContent = 'Compressing...';
	let bytes;
	try {
		bytes = await compressAsync(activePattern, quantBits);
	} catch (e) {
		uploadPatternStatusEl.textContent = '';
		alert(`Couldn't compress this pattern: ${e.message}`);
		return;
	}
	const budgetBytes = patternBudgetBytes();
	if (bytes.length > budgetBytes) {
		uploadPatternStatusEl.textContent = '';
		alert(
			`Compressed pattern is ${formatBytes(bytes.length)}, over the ` +
			`${formatBytes(budgetBytes)} budget -- lower the brightness levels, ` +
			`trim frames, or drop the fps first.`
		);
		return;
	}
	handOverBadge();
	uploadPatternStatusEl.textContent = `Uploading ${formatBytes(bytes.length)}...`;
	try {
		await device.uploadPattern(bytes, name);
		uploadPatternStatusEl.textContent =
			`Stored (${formatBytes(bytes.length)}) and playing -- will autoplay on every boot from now on.`;
		refreshStore();
	} catch (e) {
		uploadPatternStatusEl.textContent = `Upload failed: ${e.message}`;
	}
});

document.getElementById('import-compressed-input').addEventListener('change', async (ev) => {
	const file = ev.target.files[0];
	ev.target.value = '';
	if (!file) return;
	try {
		const bytes = new Uint8Array(await file.arrayBuffer());
		const { fps, frames } = decompressPattern(bytes);
		const pattern = newPattern(file.name.replace(/\.[^.]+$/, ''));
		pattern.fps = fps;
		pattern.frames = frames;
		savePattern(pattern);
		renderPatternList();
		setActivePattern(pattern);
	} catch (e) {
		alert(`Couldn't load that .ledanim file: ${e.message}`);
	}
});

// --- On the badge: the item store (store.h) ---------------------------------------------------

const storeListEl = document.getElementById('store-list');
const storeStatusEl = document.getElementById('store-status');
let storeItems = []; // [{index, type, length, name}]
let storeBusy = false; // an upload or a listing is going on

// The flash an item takes: the header and the payload, in whole pages
// (store.h), which is what the free space counts
const STORE_PAGE_BYTES = 256;
function storeItemBytes(item) {
	return Math.ceil((STORE_ITEM_HEADER_BYTES + item.length) / STORE_PAGE_BYTES) * STORE_PAGE_BYTES;
}

function renderStore() {
	renderAppLibrary(); // its Add / Update buttons follow what is stored
	storeListEl.innerHTML = '';
	if (!device.connected) {
		storeStatusEl.textContent = 'Connect to see what is stored.';
		return;
	}
	for (const item of storeItems) {
		const li = document.createElement('li');
		li.className = 'store-item';
		if (storeStatus && item.index === storeStatus.running) li.classList.add('running');
		// name, and under it the type and the flash it takes
		const label = document.createElement('span');
		label.className = 'store-label';
		const boot = storeStatus && item.index === storeStatus.boot ? '\u2605 ' : '';
		const name = document.createElement('span');
		name.className = 'store-name';
		name.textContent = `${boot}${item.name || '(no name)'}`;
		const meta = document.createElement('span');
		meta.className = 'store-meta';
		meta.textContent = `${ITEM_TYPE_NAMES[item.type] ?? 'Type ' + item.type} \u00b7 ${formatBytes(storeItemBytes(item))}`;
		meta.title = `${formatBytes(item.length)} file; on the badge it takes whole 256-byte pages, with a 32-byte header`;
		label.append(name, meta);
		const run = document.createElement('button');
		run.textContent = 'Run';
		run.addEventListener('click', () => storeAction(() => device.runItem(item.index)));
		const bootBtn = document.createElement('button');
		bootBtn.textContent = '\u2605';
		bootBtn.title = 'Run it, and at every power-on';
		bootBtn.addEventListener('click', () => storeAction(() => device.runItem(item.index, true)));
		const del = document.createElement('button');
		del.textContent = '\u{1F5D1}';
		del.title = 'Delete it from the badge';
		del.addEventListener('click', () => {
			if (!confirm(`Delete ${item.name || 'this item'} from the badge?`)) return;
			storeAction(() => device.deleteItem(item.index));
		});
		li.append(label, run, bootBtn, del);
		storeListEl.appendChild(li);
	}
	if (storeStatus && storeStatus.freeBytes !== undefined) {
		const used = storeItems.reduce((sum, item) => sum + storeItemBytes(item), 0);
		storeStatusEl.textContent =
			`${storeItems.length} item${storeItems.length === 1 ? '' : 's'}, ` +
			`${formatBytes(used)} used, ${formatBytes(storeStatus.freeBytes)} free.`;
	} else if (storeStatus) {
		storeStatusEl.textContent = 'This firmware has no item store; update the badge.';
	}
}

async function refreshStore() {
	if (!device.connected || storeBusy) return;
	storeBusy = true;
	try {
		const { status, items } = await device.listItems();
		storeStatus = status;
		storeItems = items;
	} catch (e) {
		storeStatusEl.textContent = e.message;
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
	if (changed && status.count !== undefined) refreshStore();
	else if (marks) renderStore();
}

// The badge shows something else now: the editor stops sending to it
function handOverBadge() {
	stopPlayback();
	liveCancel();
}

async function storeAction(action) {
	if (!device.connected) {
		alert('Connect to a device first.');
		return;
	}
	handOverBadge();
	try {
		await action();
	} catch (e) {
		alert(e.message);
	}
	refreshStore();
}

document.getElementById('store-add-input').addEventListener('change', async (ev) => {
	const file = ev.target.files[0];
	ev.target.value = '';
	if (!file) return;
	if (!device.connected) {
		alert('Connect to a device first.');
		return;
	}
	const bytes = new Uint8Array(await file.arrayBuffer());
	const magic = new TextDecoder().decode(bytes.subarray(0, 4));
	const name = file.name.replace(/\.[^.]+$/, '').toUpperCase();
	if (/\.txt$/i.test(file.name)) {
		try {
			await addToBadge(ITEM_TYPE.TEXT, name, makeTextItem(new TextDecoder().decode(bytes)));
		} catch (e) {
			alert(e.message);
		}
		return;
	}
	const type = magic === 'HHAP' ? ITEM_TYPE.APP : magic === 'LA04' ? ITEM_TYPE.ANIMATION : 0;
	if (!type) {
		alert(`${file.name} is not an app (.hhapp), an animation (.ledanim) or a text (.txt).`);
		return;
	}
	await addToBadge(type, name, bytes);
});

// A text item (text_item.js): the badge draws the text in its own font
const textItemInput = document.getElementById('text-item-input');
const textItemStatus = document.getElementById('text-item-status');
function textItemCheck() {
	const ascii = textItemAscii(textItemInput.value);
	const room = patternBudgetBytes() - TEXT_ITEM.HEADER_BYTES;
	textItemStatus.textContent = ascii
		? `${ascii.length} characters${ascii.length > room ? `, ${room} fit on the badge now` : ''}.`
		: '';
	return ascii;
}
textItemInput.addEventListener('input', textItemCheck);
document.getElementById('text-item-btn').addEventListener('click', async () => {
	if (!device.connected) {
		alert('Connect to a device first.');
		return;
	}
	let bytes;
	try {
		bytes = makeTextItem(textItemInput.value, {
			speed: document.getElementById('text-item-speed').value,
			style: document.getElementById('text-item-plain').checked ? TEXT_ITEM.STYLE.PLAIN : TEXT_ITEM.STYLE.NAMETAG,
		});
	} catch (e) {
		alert(e.message);
		return;
	}
	await addToBadge(ITEM_TYPE.TEXT, textItemName(textItemInput.value), bytes);
});

// Stores an item on the badge (it starts at once). If `replace` is the
// index of an older copy, that one is deleted afterwards: the new item
// went in after it, so its index is still right.
async function addToBadge(type, name, bytes, replace = null) {
	handOverBadge();
	storeBusy = true;
	try {
		await device.storeItem(type, name, bytes, (sent, total) => {
			storeStatusEl.textContent = `Uploading ${name}: ${Math.round((100 * sent) / total)}%`;
		});
		if (replace !== null) await device.deleteItem(replace);
	} catch (e) {
		// firmware from before text items refuses the type
		if (type === ITEM_TYPE.TEXT && e.result === 1)
			alert('The badge\'s firmware does not know text items yet. Update it in the Firmware panel first.');
		else alert(e.message);
	} finally {
		storeBusy = false;
	}
	await refreshStore();
}

// --- App library: the apps that come with the firmware (webui/apps/, made
// by `make -C apps webui`) ---------------------------------------------------

// var, not let: renderStore() may run before this part of the file has
var appLibrary = []; // [{name, file, bytes, api, description, recommended}]
var appRecommended = []; // the names of the recommended set, in install order (apps/recommended.txt)

function renderAppLibrary() {
	const appLibraryEl = document.getElementById('app-library');
	appLibraryEl.innerHTML = '';
	for (const app of appLibrary) {
		const li = document.createElement('li');
		li.className = 'store-item';
		const label = document.createElement('span');
		label.className = 'store-label';
		const name = document.createElement('span');
		name.className = 'store-name';
		name.textContent = app.name;
		name.title = app.description;
		const meta = document.createElement('span');
		meta.className = 'store-meta';
		meta.textContent = `App \u00b7 ${formatBytes(storeItemBytes({ length: app.bytes }))}${app.recommended ? ' \u00b7 recommended' : ''}`;
		meta.title = app.description;
		label.append(name, meta);

		const old = storeItems.find((item) => item.type === ITEM_TYPE.APP && item.name === app.name);
		const btn = document.createElement('button');
		btn.textContent = old ? 'Update' : 'Add';
		const api = storeStatus && storeStatus.api;
		if (!device.connected) {
			btn.disabled = true;
			btn.title = 'Connect to the badge first';
		} else if (api !== undefined && api < app.api) {
			btn.disabled = true;
			btn.title = `Needs firmware with app API ${app.api}; the badge has ${api}. Update the firmware first.`;
		} else {
			btn.title = old ? `Replace the ${app.name} on the badge` : `Store ${app.name} on the badge and start it`;
		}
		btn.addEventListener('click', async () => {
			try {
				const r = await fetch(`apps/${app.file}`, { cache: 'no-store' });
				if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
				const bytes = new Uint8Array(await r.arrayBuffer());
				if (new TextDecoder().decode(bytes.subarray(0, 4)) !== 'HHAP') throw new Error('not an app');
				await addToBadge(ITEM_TYPE.APP, app.name, bytes, old ? old.index : null);
			} catch (e) {
				alert(`Couldn't add ${app.name}: ${e.message}`);
			}
		});
		li.append(label, btn);
		appLibraryEl.appendChild(li);
	}
	if (!appLibrary.length) appLibraryEl.innerHTML = '<li class="hint">No apps found (make -C apps webui).</li>';
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
	btn.disabled = !apps.length || !device.connected || (api !== undefined && api < needs);
	btn.title = !device.connected
		? 'Connect to the badge first'
		: api !== undefined && api < needs
			? `Needs firmware with app API ${needs}; the badge has ${api}. Update the firmware first.`
			: 'Erases the badge, then installs these apps';
	hint.textContent = apps.length
		? `${apps.length} apps, ${formatBytes(bytes)}: ${apps.map((a) => a.name).join(', ')}. Erases the badge first.`
		: '';
}

async function installRecommended() {
	if (!device.connected) {
		alert('Connect to a device first.');
		return;
	}
	const apps = appRecommended.map((n) => appLibrary.find((a) => a.name === n)).filter(Boolean);
	if (!confirm(`Erase every app, animation and text on the badge, then install the recommended set (${apps.length} apps)?\n\nYour name and the apps' saved data (high scores) stay.`)) return;
	handOverBadge();
	storeBusy = true;
	try {
		// every download first, so a failed one erases nothing
		const files = [];
		for (const app of apps) {
			const r = await fetch(`apps/${app.file}`, { cache: 'no-store' });
			if (!r.ok) throw new Error(`${app.name}: ${r.status} ${r.statusText}`);
			files.push([app, new Uint8Array(await r.arrayBuffer())]);
		}
		storeStatusEl.textContent = 'Erasing the badge';
		await device.eraseStore();
		for (let i = 0; i < files.length; i++) {
			const [app, bytes] = files[i];
			await device.storeItem(ITEM_TYPE.APP, app.name, bytes, (sent, total) => {
				storeStatusEl.textContent = `Installing ${i + 1} of ${files.length}, ${app.name}: ${Math.round((100 * sent) / total)}%`;
			});
		}
	} catch (e) {
		alert(`The recommended set did not install completely: ${e.message}`);
	} finally {
		storeBusy = false;
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

document.getElementById('store-stop-btn').addEventListener('click', () => storeAction(() => device.stop()));

document.getElementById('store-erase-btn').addEventListener('click', () => {
	if (!confirm('Erase every app and animation on the badge? (Your name and the apps\' saved data stay.)')) return;
	storeAction(() => device.eraseStore());
});

const badgeNameInput = document.getElementById('badge-name');

document.getElementById('badge-name-btn').addEventListener('click', () =>
	storeAction(async () => {
		badgeNameInput.value = await device.setName(badgeNameInput.value.trim());
	})
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
	renderStore();
});

// --- Init ---------------------------------------------------

// version.json is written by tools/deploy_webui.sh: which commit this page is
fetch('version.json', { cache: 'no-store' })
	.then((r) => (r.ok ? r.json() : null))
	.then((v) => {
		if (v) document.getElementById('webui-version').textContent = `-- web interface ${v.commit} (${v.date})`;
	})
	.catch(() => {});

renderPatternList();
renderFrameStrip();
loadFrameIntoBoard();
