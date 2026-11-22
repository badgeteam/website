// Converts typed text into a scrolling-marquee animation across the LED
// matrix, restricted to the board's dense center cluster -- plus optional
// chase/blink/twinkle effects for the sparser LEDs running out along the
// arms (both the plain white ones and the diamond-shaped RGB accents),
// which are too sparsely spaced to show a legible glyph at this text size
// anyway. Core/arm split reuses video_import.js's findCoreCircle(), and
// the text itself is rendered once onto a wide offscreen canvas at the
// same height/aspect scale that file's sampleFrame() samples from, then a
// viewport is slid across it one frame at a time -- so text ends up with
// the same anti-aliased-edge-as-brightness look as video frames, from one
// sampling codepath, rather than a second one tuned separately. Pure
// extraction logic, no DOM wiring -- app.js wires this to the "Text to
// animation" panel.
'use strict';

// Frame count is `travel / scrollSpeed`; a long string at 0.5px/frame
// could ask for tens of thousands of 352-value frames, which is really a
// typo (or a very patient user) rather than an intentional animation --
// cap it so a stray "0.5" in the speed box can't lock up the tab. Also
// doubles as the cap on a static (non-scrolling) frame's edge-effect loop.
const TEXT_MAX_FRAMES = 2000;

function measureTextWidthPx(ctx, text, fontPx, bold) {
	ctx.font = `${bold ? 'bold ' : ''}${fontPx}px sans-serif`;
	return ctx.measureText(text).width;
}

// Renders `text` once onto a canvas exactly as tall as the board-shaped
// sampling canvas (so vertical scale matches the board 1:1, no per-frame
// rescaling), padded with one full viewport width of blank space on each
// side -- so a scroll can start and end fully offscreen instead of the
// text popping in/out mid-character. `centerY` is where the text's
// vertical middle lands, in that same canvas's pixel space -- the core
// LED cluster's own center, not the full board bounding box's (the
// starfish's arms aren't symmetric top-to-bottom, so those two centers
// differ enough to visibly throw off vertical centering of text that
// only ever lights the core).
function renderTextStrip(text, canvasHeight, viewportWidth, fontPx, bold, color, centerY) {
	const measure = document.createElement('canvas').getContext('2d');
	const textWidth = Math.ceil(measureTextWidthPx(measure, text, fontPx, bold));

	const canvas = document.createElement('canvas');
	canvas.width = Math.max(1, textWidth) + viewportWidth * 2;
	canvas.height = canvasHeight;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.font = `${bold ? 'bold ' : ''}${fontPx}px sans-serif`;
	ctx.fillStyle = color;
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'left';
	ctx.fillText(text, viewportWidth, centerY);
	return canvas;
}

function hexToRgb(hex) {
	return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function hsvToRgb(h, s, v) {
	const c = v * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = v - c;
	let r, g, b;
	if (h < 60) [r, g, b] = [c, x, 0];
	else if (h < 120) [r, g, b] = [x, c, 0];
	else if (h < 180) [r, g, b] = [0, c, x];
	else if (h < 240) [r, g, b] = [0, x, c];
	else if (h < 300) [r, g, b] = [x, 0, c];
	else [r, g, b] = [c, 0, x];
	return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// Sorts LEDs into a stable ring order by angle around (cx, cy) -- same
// trick app.js's pharmacy-sign chase uses -- so walking the list in this
// order visits LEDs roughly in a loop around the board rather than in
// wiring (row/col) order, which is what makes a "chase" actually chase.
function ringOrder(leds, cx, cy) {
	return [...leds].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
}

// Brightness (0..1) of one step of a comet-style chase around `ring`:
// tapers linearly to 0 over `tailLength` ring steps on either side of
// `headPos` (a fractional ring position), wrapping around the ends.
function chaseLevel(n, index, headPos, tailLength) {
	let dist = Math.abs(index - headPos);
	dist = Math.min(dist, n - dist);
	return dist <= tailLength ? 1 - dist / tailLength : 0;
}

// phase is "fraction of one full cycle elapsed", already wrapped into
// [0, 1) by the caller -- chase treats it as ring position, blink as an
// on/off split, twinkle ignores it (random each frame).
function applyWhiteEdgeEffect(frame, ring, effect, phase) {
	if (effect === 'none' || ring.length === 0) return;
	const n = ring.length;
	if (effect === 'chase') {
		const headPos = phase * n;
		const tailLength = Math.max(2, n * 0.12);
		for (let i = 0; i < n; i++) {
			const level = chaseLevel(n, i, headPos, tailLength);
			if (level > 0) frame[ring[i].row * MATRIX_COLS + ring[i].col] = clamp255(255 * level);
		}
	} else if (effect === 'blink') {
		const level = phase < 0.5 ? 255 : 0;
		for (const led of ring) frame[led.row * MATRIX_COLS + led.col] = level;
	} else if (effect === 'twinkle') {
		for (const led of ring) {
			if (Math.random() < 0.25) frame[led.row * MATRIX_COLS + led.col] = 100 + Math.round(Math.random() * 155);
		}
	}
}

function applyRgbEdgeEffect(frame, ring, effect, phase, colorHex) {
	if (effect === 'none' || ring.length === 0) return;
	const n = ring.length;
	const [cr, cg, cb] = hexToRgb(colorHex);
	const setLed = (led, r, g, b) => {
		frame[led.row * MATRIX_COLS + led.col] = clamp255(r);
		frame[led.green_row * MATRIX_COLS + led.col] = clamp255(g);
		frame[led.blue_row * MATRIX_COLS + led.col] = clamp255(b);
	};
	if (effect === 'chase') {
		const headPos = phase * n;
		const tailLength = Math.max(1.5, n * 0.2);
		for (let i = 0; i < n; i++) {
			const level = chaseLevel(n, i, headPos, tailLength);
			setLed(ring[i], cr * level, cg * level, cb * level);
		}
	} else if (effect === 'blink') {
		const level = phase < 0.5 ? 1 : 0;
		for (const led of ring) setLed(led, cr * level, cg * level, cb * level);
	} else if (effect === 'twinkle') {
		for (const led of ring) {
			if (Math.random() < 0.25) {
				const level = 0.4 + Math.random() * 0.6;
				setLed(led, cr * level, cg * level, cb * level);
			}
		}
	} else if (effect === 'rainbow') {
		for (let i = 0; i < n; i++) {
			const hue = ((i / n) * 360 + phase * 360) % 360;
			const [r, g, b] = hsvToRgb(hue, 1, 1);
			setLed(ring[i], r, g, b);
		}
	}
}

// opts: { text, fontSize (px, same pixel scale as scrollSpeed), bold,
// color ('#rrggbb'), scrollSpeed (px/frame), bounds, brightnessBoost,
// scroll, whiteEdgeEffect, whiteEdgeSpeed, rgbEdgeEffect, rgbEdgeSpeed,
// rgbEdgeColor }. bounds is a BoardView's `.bounds` ({minX, minY, width,
// height} in mm), same as extractFramesFromVideo takes.
//
// Only the board's dense center LED cluster (see video_import.js's
// findCoreCircle) ever samples the text -- the sparser LEDs out along the
// arms, both plain white and RGB, are driven purely by the edge effects
// below (each effect name is 'none'/'chase'/'blink'/'twinkle', plus
// 'rainbow' for the RGB group only). *EdgeSpeed is a fraction of one full
// chase/blink cycle advanced per frame.
//
// scroll: false skips the marquee and returns one centered static frame,
// but only makes sense if the text actually fits in one viewport -- if it
// doesn't, there's no non-scrolling way to show all of it, so this still
// scrolls regardless. If an edge effect is active, that "static" frame
// still gets animated through one full effect cycle rather than frozen.
//
// Returns { frames: [[352 ints], ...] } (empty array for blank text).
function extractFramesFromText(opts) {
	const {
		text,
		fontSize,
		bold,
		color,
		scrollSpeed,
		bounds,
		brightnessBoost,
		scroll,
		whiteEdgeEffect = 'none',
		whiteEdgeSpeed = 0.05,
		rgbEdgeEffect = 'none',
		rgbEdgeSpeed = 0.08,
		rgbEdgeColor = '#39d2c0',
	} = opts;
	if (!text || !text.trim()) return { frames: [] };

	const coreGeom = findCoreCircle(BOARD_DATA.leds);
	const isCore = (led) => Math.hypot(led.x - coreGeom.cx, led.y - coreGeom.cy) <= coreGeom.radius;
	const coreLeds = BOARD_DATA.leds.filter(isCore);
	const armRing = ringOrder(BOARD_DATA.leds.filter((l) => !isCore(l)), coreGeom.cx, coreGeom.cy);
	const rgbRing = ringOrder(BOARD_DATA.rgb_leds, coreGeom.cx, coreGeom.cy);

	const boardAspect = bounds.width / bounds.height;
	const canvasWidth = SAMPLE_CANVAS_WIDTH;
	const canvasHeight = Math.max(1, Math.round(canvasWidth / boardAspect));
	const coreCenterY = ((coreGeom.cy - bounds.minY) / bounds.height) * canvasHeight;

	const strip = renderTextStrip(text, canvasHeight, canvasWidth, fontSize, bold, color, coreCenterY);

	const boardCanvas = document.createElement('canvas');
	boardCanvas.width = canvasWidth;
	boardCanvas.height = canvasHeight;
	const boardCtx = boardCanvas.getContext('2d', { willReadFrequently: true });

	const drawViewportAt = (offsetX) => {
		boardCtx.fillStyle = 'black';
		boardCtx.fillRect(0, 0, canvasWidth, canvasHeight);
		boardCtx.drawImage(strip, -offsetX, 0);
	};
	const sampleCoreAt = (offsetX) => {
		drawViewportAt(offsetX);
		return sampleFrame(boardCanvas, boardCtx, bounds, brightnessBoost, coreLeds, []);
	};
	const applyEdgeEffects = (frame, frameIndex) => {
		applyWhiteEdgeEffect(frame, armRing, whiteEdgeEffect, (frameIndex * whiteEdgeSpeed) % 1);
		applyRgbEdgeEffect(frame, rgbRing, rgbEdgeEffect, (frameIndex * rgbEdgeSpeed) % 1, rgbEdgeColor);
	};

	// `strip` was padded with one viewport-width of blank space on each
	// side, so offset 0 is already "text fully off the right edge" and
	// offset === travel is "text fully off the left edge". travel is thus
	// textWidth + canvasWidth, so "the text itself (ignoring padding) fits
	// in one viewport" is travel <= 2 * canvasWidth.
	const travel = strip.width - canvasWidth;
	const edgeEffectsActive = whiteEdgeEffect !== 'none' || rgbEdgeEffect !== 'none';

	if (!scroll && travel <= 2 * canvasWidth) {
		const textFrame = sampleCoreAt(Math.round(travel / 2));
		if (!edgeEffectsActive) return { frames: [textFrame] };

		const activeSpeeds = [];
		if (whiteEdgeEffect !== 'none') activeSpeeds.push(whiteEdgeSpeed);
		if (rgbEdgeEffect !== 'none') activeSpeeds.push(rgbEdgeSpeed);
		const minSpeed = Math.min(1, ...activeSpeeds);
		const cycleFrames = Math.min(TEXT_MAX_FRAMES, Math.max(4, Math.round(1 / Math.max(0.001, minSpeed))));
		const frames = [];
		for (let i = 0; i < cycleFrames; i++) {
			const frame = textFrame.slice();
			applyEdgeEffects(frame, i);
			frames.push(frame);
		}
		return { frames };
	}

	const step = Math.max(0.1, scrollSpeed);
	const frameCount = Math.min(TEXT_MAX_FRAMES, Math.max(1, Math.round(travel / step)));
	const frames = [];
	for (let i = 0; i <= frameCount; i++) {
		const frame = sampleCoreAt(Math.min(travel, i * step));
		applyEdgeEffects(frame, i);
		frames.push(frame);
	}
	return { frames };
}
