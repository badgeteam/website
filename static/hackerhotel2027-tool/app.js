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
	if (liveSendInput.checked && device.connected) {
		device.setPixel(row, col, level);
	}
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
	if (liveSendInput.checked && device.connected) {
		device.setPixel(led.row, led.col, r);
		device.setPixel(led.green_row, led.col, g);
		device.setPixel(led.blue_row, led.col, b);
	}
}

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
const disconnectBtn = document.getElementById('disconnect-btn');
const connStatusEl = document.getElementById('conn-status');
const deviceModeEl = document.getElementById('device-mode');

function webUsbAvailable() {
	return typeof navigator !== 'undefined' && !!navigator.usb;
}

function refreshConnButtons() {
	connectBtn.hidden = device.connected;
	disconnectBtn.hidden = !device.connected;
	connStatusEl.textContent = device.connected ? 'Connected' : 'Not connected';
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
device.addEventListener('connect', refreshConnButtons);
device.addEventListener('disconnect', refreshConnButtons);
// Must match APP_MODE_* in the firmware's webusb_protocol.h
const DEVICE_MODE_NAMES = { 1: 'Custom frame', 2: 'Stored pattern' };

device.addEventListener('status', (ev) => {
	const { mode, brightness } = ev.detail;
	const name = DEVICE_MODE_NAMES[mode] ?? `Mode ${mode}`;
	deviceModeEl.textContent = `${name}, brightness ${brightness}`;
});

if (!webUsbAvailable()) {
	connectBtn.disabled = true;
	connStatusEl.textContent = 'WebUSB not available in this browser';
} else {
	device.tryAutoReconnect().catch(() => {});
	setInterval(() => {
		if (device.connected) device.query();
	}, 1000);
}
refreshConnButtons();

// --- Clear / send ---------------------------------------------------

document.getElementById('clear-btn').addEventListener('click', () => {
	board.clear();
	currentFrame().fill(0);
	if (device.connected) device.clear();
});

document.getElementById('send-frame-btn').addEventListener('click', () => {
	if (!device.connected) {
		alert('Connect to a device first.');
		return;
	}
	device.uploadFrame(Uint8Array.from(currentFrame()));
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
	const sendToDevice = device.connected;
	playBtn.textContent = '■ Stop';
	playTimer = setInterval(async () => {
		activeFrameIndex = (activeFrameIndex + 1) % activePattern.frames.length;
		loadFrameIntoBoard();
		renderFrameStrip();
		if (sendToDevice) {
			try {
				await device.uploadFrame(Uint8Array.from(currentFrame()));
			} catch (e) {
				/* webusb.js already logs this */
			}
		}
	}, 1000 / activePattern.fps);
}

playBtn.addEventListener('click', () => {
	if (playTimer) stopPlayback();
	else startPlayback();
});

// --- Flash storage (compressed .ledanim export/import) ---------------------------------------------------
// Compression format/rationale: docs/ANIMATION_FORMAT.md, codec in
// compression.js. No firmware support for reading this back from flash
// yet (see that doc) -- this is purely the browser-side half, so there's
// a known format ready once that firmware feature exists.

const compressionQuantSelect = document.getElementById('compression-quant');
const compressionStatsEl = document.getElementById('compression-stats');

// Size of the flash region the firmware reserves for the pattern
// (PATTERN_FLASH_SIZE in pattern_flash.h)
const PATTERN_FLASH_BYTES = 32 * 1024;

function formatBytes(n) {
	return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
}

function refreshCompressionStats() {
	if (!activePattern) return;
	const quantBits = Number(compressionQuantSelect.value);
	const budgetBytes = PATTERN_FLASH_BYTES;
	const rawBytes = activePattern.frames.length * MATRIX_ROWS * MATRIX_COLS;
	let compressedBytes;
	try {
		compressedBytes = compressPattern(activePattern, { quantBits }).byteLength;
	} catch (e) {
		compressionStatsEl.textContent = `Can't estimate: ${e.message}`;
		return;
	}
	const pct = rawBytes ? Math.round((100 * compressedBytes) / rawBytes) : 0;
	const fits = compressedBytes <= budgetBytes;
	const overBy = compressedBytes - budgetBytes;
	compressionStatsEl.textContent = fits
		? `${activePattern.frames.length} frames: ${formatBytes(compressedBytes)} compressed ` +
		  `(${pct}% of ${formatBytes(rawBytes)} raw) -- fits the ${formatBytes(budgetBytes)} budget.`
		: `${activePattern.frames.length} frames: ${formatBytes(compressedBytes)} compressed ` +
		  `(${pct}% of ${formatBytes(rawBytes)} raw) -- ${formatBytes(overBy)} over the ` +
		  `${formatBytes(budgetBytes)} budget. Lower the brightness levels, trim frames, or drop the fps.`;
	compressionStatsEl.classList.toggle('stats-over-budget', !fits);
}

compressionQuantSelect.addEventListener('change', refreshCompressionStats);

document.getElementById('export-compressed-btn').addEventListener('click', () => {
	const quantBits = Number(compressionQuantSelect.value);
	let bytes;
	try {
		bytes = compressPattern(activePattern, { quantBits });
	} catch (e) {
		alert(`Couldn't compress this pattern: ${e.message}`);
		return;
	}
	const blob = new Blob([bytes], { type: 'application/octet-stream' });
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = `${activePattern.name.replace(/[^\w-]+/g, '_') || 'pattern'}.ledanim`;
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
	const budgetBytes = PATTERN_FLASH_BYTES;
	let bytes;
	try {
		bytes = compressPattern(activePattern, { quantBits });
	} catch (e) {
		alert(`Couldn't compress this pattern: ${e.message}`);
		return;
	}
	if (bytes.length > budgetBytes) {
		alert(
			`Compressed pattern is ${formatBytes(bytes.length)}, over the ` +
			`${formatBytes(budgetBytes)} budget -- lower the brightness levels, ` +
			`trim frames, or drop the fps first.`
		);
		return;
	}
	uploadPatternStatusEl.textContent = `Uploading ${formatBytes(bytes.length)}...`;
	try {
		await device.uploadPattern(bytes);
		uploadPatternStatusEl.textContent =
			`Stored (${formatBytes(bytes.length)}) and playing -- will autoplay on every boot from now on.`;
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

// --- Init ---------------------------------------------------

renderPatternList();
renderFrameStrip();
loadFrameIntoBoard();
