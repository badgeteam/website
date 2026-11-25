// Converts a video file into LED matrix animation frames, sampling each
// LED's *actual physical board position* out of the video rather than
// just resizing it onto a generic grid -- so the irregular starfish
// layout (see docs/LEDPWM_MATRIX.md) gets a reasonable likeness instead
// of a squashed rectangle. Pure extraction logic, no DOM wiring beyond
// the offscreen <video>/<canvas> elements it needs internally -- app.js
// wires this to the "Import from video" panel.
'use strict';

const SAMPLE_CANVAS_WIDTH = 160; // only ever sampled at LED positions, doesn't need to be large

// Ambilight mode: how far inward (as a fraction of the core's radius) an
// edge sample is taken from the true crop boundary, and how big a patch
// around it gets averaged. Both exist for the same reason real Ambilight
// averages a margin strip rather than reading single edge pixels: a lone
// boundary pixel is noisy and tends to look flickery frame to frame.
const AMBILIGHT_EDGE_INSET = 0.08;
const AMBILIGHT_PATCH_FRACTION = 0.1;

function clamp255(v) {
	return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function loadVideoElement(file) {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const video = document.createElement('video');
		video.preload = 'auto';
		video.muted = true;
		video.playsInline = true;
		video.src = url;
		video.addEventListener('loadedmetadata', () => resolve({ video, url }), { once: true });
		video.addEventListener(
			'error',
			() => {
				URL.revokeObjectURL(url);
				reject(new Error("Couldn't load that as a video file"));
			},
			{ once: true }
		);
	});
}

function seekTo(video, time) {
	return new Promise((resolve) => {
		const onSeeked = () => {
			video.removeEventListener('seeked', onSeeked);
			resolve();
		};
		video.addEventListener('seeked', onSeeked);
		video.currentTime = time;
	});
}

// Draws whatever the video is currently showing onto `canvas`, cropped
// ("cover" fit, like CSS object-fit: cover) to the board's aspect ratio --
// so canvas-pixel-space maps 1:1 onto board-mm-space via `bounds`, and
// sampling each LED's position needs no further per-LED math.
function drawCoverFit(video, canvas, ctx, boardAspect) {
	// a <video>, or a VideoFrame from an animated image (ImageDecoder)
	const vw = video.videoWidth ?? video.displayWidth;
	const vh = video.videoHeight ?? video.displayHeight;
	const videoAspect = vw / vh;
	let sx, sy, sw, sh;
	if (videoAspect > boardAspect) {
		sh = vh;
		sw = vh * boardAspect;
		sx = (vw - sw) / 2;
		sy = 0;
	} else {
		sw = vw;
		sh = vw / boardAspect;
		sx = 0;
		sy = (vh - sh) / 2;
	}
	ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
}

// The matrix has a visually distinct dense, roughly circular cluster in
// the middle of the starfish, surrounded by sparser LEDs running out
// along the five arms -- confirmed against webui/board_data.js: there's a
// clean gap in every mono LED's distance from the cluster's centroid
// (nothing between ~17mm and ~21mm out), splitting 277 mono LEDs into 208
// densely-packed "core" ones and 69 sparse "arm" ones (all 25 RGB LEDs
// turned out to sit on the arms, none in the core). Ambilight mode
// treats the core circle as "the screen" and the arms as light spilling
// out from its edges, like a Philips Ambilight TV.
//
// Found by largest-gap search rather than a hardcoded radius so this
// keeps working if the board layout (and hence board_data.js) ever
// changes -- if no clear gap exists, falls back to "everything is core,
// no arms", which degrades ambilight mode to plain cover-fit.
function findCoreCircle(leds) {
	const cx0 = leds.reduce((s, l) => s + l.x, 0) / leds.length;
	const cy0 = leds.reduce((s, l) => s + l.y, 0) / leds.length;
	const sorted = leds
		.map((l) => ({ l, d: Math.hypot(l.x - cx0, l.y - cy0) }))
		.sort((a, b) => a.d - b.d);

	let bestGap = 0;
	let bestGapIndex = -1;
	for (let i = 1; i < sorted.length; i++) {
		const gap = sorted[i].d - sorted[i - 1].d;
		if (gap > bestGap) {
			bestGap = gap;
			bestGapIndex = i;
		}
	}
	// A few mm is a real gap between clusters; anything smaller is just
	// normal spacing noise within one cluster, and a gap found in the
	// first quarter of the sorted list is more likely noise than a real
	// "core vs. arms" boundary -- in either case, there's no meaningful
	// split to make.
	if (bestGap < 2 || bestGapIndex < leds.length / 4) {
		return { cx: cx0, cy: cy0, radius: Infinity };
	}

	const core = sorted.slice(0, bestGapIndex).map((e) => e.l);
	const cx = core.reduce((s, l) => s + l.x, 0) / core.length;
	const cy = core.reduce((s, l) => s + l.y, 0) / core.length;
	const radius = Math.max(...core.map((l) => Math.hypot(l.x - cx, l.y - cy)));
	return { cx, cy, radius };
}

function sampleAtCanvasPoint(img, canvasWidth, canvasHeight, px, py) {
	const cx = Math.min(canvasWidth - 1, Math.max(0, Math.round(px)));
	const cy = Math.min(canvasHeight - 1, Math.max(0, Math.round(py)));
	const i = (cy * canvasWidth + cx) * 4;
	return [img[i], img[i + 1], img[i + 2]];
}

function sampleAveragePatch(img, canvasWidth, canvasHeight, px, py, patchRadius) {
	const x0 = Math.max(0, Math.round(px - patchRadius));
	const x1 = Math.min(canvasWidth - 1, Math.round(px + patchRadius));
	const y0 = Math.max(0, Math.round(py - patchRadius));
	const y1 = Math.min(canvasHeight - 1, Math.round(py + patchRadius));
	let r = 0, g = 0, b = 0, n = 0;
	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			const i = (y * canvasWidth + x) * 4;
			r += img[i];
			g += img[i + 1];
			b += img[i + 2];
			n++;
		}
	}
	return n ? [r / n, g / n, b / n] : [0, 0, 0];
}

// `canvas`/`ctx` here already hold a *square* cover-fit crop of the video
// (see extractFramesFromVideo's ambilightMode branch) centered on, and
// exactly as wide as, the core circle's bounding box -- so a core LED's
// own (x, y) maps directly onto it, and an arm LED's angle from the core
// center projects onto that same square's edge for its Ambilight sample.
function sampleFrameAmbilight(canvas, ctx, coreGeom, brightnessBoost) {
	const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
	const half = canvas.width / 2; // square canvas: one half-size for both axes
	const originMm = coreGeom.cx - coreGeom.radius; // canvas (0,0) in board mm, x
	const originMmY = coreGeom.cy - coreGeom.radius; // canvas (0,0) in board mm, y
	const mmToPx = canvas.width / (2 * coreGeom.radius);

	const sampleCore = (xmm, ymm) =>
		sampleAtCanvasPoint(img, canvas.width, canvas.height, (xmm - originMm) * mmToPx, (ymm - originMmY) * mmToPx);

	const sampleEdge = (xmm, ymm) => {
		const angle = Math.atan2(ymm - coreGeom.cy, xmm - coreGeom.cx);
		const dx = Math.cos(angle);
		const dy = Math.sin(angle);
		const tx = dx !== 0 ? half / Math.abs(dx) : Infinity;
		const ty = dy !== 0 ? half / Math.abs(dy) : Infinity;
		const t = Math.min(tx, ty) * (1 - AMBILIGHT_EDGE_INSET);
		return sampleAveragePatch(
			img,
			canvas.width,
			canvas.height,
			half + dx * t,
			half + dy * t,
			canvas.width * AMBILIGHT_PATCH_FRACTION
		);
	};

	const isCore = (xmm, ymm) => Math.hypot(xmm - coreGeom.cx, ymm - coreGeom.cy) <= coreGeom.radius;

	const frame = new Array(MATRIX_ROWS * MATRIX_COLS).fill(0);
	for (const led of BOARD_DATA.leds) {
		const [r, g, b] = isCore(led.x, led.y) ? sampleCore(led.x, led.y) : sampleEdge(led.x, led.y);
		const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
		frame[led.row * MATRIX_COLS + led.col] = clamp255(luminance * brightnessBoost);
	}
	for (const led of BOARD_DATA.rgb_leds) {
		const [r, g, b] = isCore(led.x, led.y) ? sampleCore(led.x, led.y) : sampleEdge(led.x, led.y);
		frame[led.row * MATRIX_COLS + led.col] = clamp255(r * brightnessBoost);
		frame[led.green_row * MATRIX_COLS + led.col] = clamp255(g * brightnessBoost);
		frame[led.blue_row * MATRIX_COLS + led.col] = clamp255(b * brightnessBoost);
	}
	return frame;
}

// monoLeds/rgbLeds default to the whole board -- video import wants every
// LED sampled, but webui/text_import.js passes a core-only subset (and no
// rgb_leds) so typed text only lights the dense center cluster, leaving
// the arms free for its own chase/blink effects.
function sampleFrame(canvas, ctx, bounds, brightnessBoost, monoLeds = BOARD_DATA.leds, rgbLeds = BOARD_DATA.rgb_leds) {
	const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
	const sampleAt = (xmm, ymm) => {
		const px = Math.round(((xmm - bounds.minX) / bounds.width) * (canvas.width - 1));
		const py = Math.round(((ymm - bounds.minY) / bounds.height) * (canvas.height - 1));
		const cx = Math.min(canvas.width - 1, Math.max(0, px));
		const cy = Math.min(canvas.height - 1, Math.max(0, py));
		const i = (cy * canvas.width + cx) * 4;
		return [img[i], img[i + 1], img[i + 2]];
	};

	const frame = new Array(MATRIX_ROWS * MATRIX_COLS).fill(0);
	for (const led of monoLeds) {
		const [r, g, b] = sampleAt(led.x, led.y);
		const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
		frame[led.row * MATRIX_COLS + led.col] = clamp255(luminance * brightnessBoost);
	}
	for (const led of rgbLeds) {
		const [r, g, b] = sampleAt(led.x, led.y);
		frame[led.row * MATRIX_COLS + led.col] = clamp255(r * brightnessBoost);
		frame[led.green_row * MATRIX_COLS + led.col] = clamp255(g * brightnessBoost);
		frame[led.blue_row * MATRIX_COLS + led.col] = clamp255(b * brightnessBoost);
	}
	return frame;
}

// opts: { fps, startTime, duration, bounds, brightnessBoost, ambilight }.
// bounds is a BoardView's `.bounds` ({minX, minY, width, height} in mm) --
// passed in rather than reached for globally so this stays a plain,
// testable function. onProgress(done, total) is called after each frame;
// pass shouldAbort() => bool to let the caller cancel mid-conversion.
//
// ambilight: false (default) crops/scales the video to the whole board's
// bounding box, like object-fit: cover, and every LED samples its own
// position in that -- the original behavior. true instead crops/scales
// to a square matching the matrix's central dense "core" cluster (so,
// depending on the video's aspect ratio, some left/right or top/bottom
// content is cropped away, and the core's own round-ish shape means its
// corners -- having no LEDs there anyway -- show nothing); every other
// LED then samples an averaged patch from whichever edge of that square
// its angle from the core's center points at, Philips-Ambilight style.
//
// Returns { frames: [[352 ints], ...] }. No cap on frame count -- a
// careless "whole movie at 20fps" input will seek-and-sample as many
// times as that implies (slow, but the Cancel button -- `shouldAbort` --
// is the way out of that, not a silent truncation).
async function extractFramesFromVideo(file, opts, onProgress, shouldAbort) {
	if (isAnimatedImage(file)) return extractFramesFromAnimatedImage(file, opts, onProgress, shouldAbort);
	const { fps, startTime, duration, bounds, brightnessBoost, ambilight } = opts;
	const { video, url } = await loadVideoElement(file);
	try {
		const clipDuration = Math.max(0, Math.min(duration, video.duration - startTime));
		const frameCount = Math.max(1, Math.round(clipDuration * fps));

		const coreGeom = ambilight ? findCoreCircle(BOARD_DATA.leds) : null;
		const cropAspect = ambilight ? 1 : bounds.width / bounds.height; // core crop is square

		const canvas = document.createElement('canvas');
		canvas.width = SAMPLE_CANVAS_WIDTH;
		canvas.height = Math.max(1, Math.round(SAMPLE_CANVAS_WIDTH / cropAspect));
		const ctx = canvas.getContext('2d', { willReadFrequently: true });

		const frames = [];
		for (let i = 0; i < frameCount; i++) {
			if (shouldAbort && shouldAbort()) break;
			const t = Math.min(startTime + i / fps, Math.max(0, video.duration - 0.001));
			await seekTo(video, t);
			drawCoverFit(video, canvas, ctx, cropAspect);
			frames.push(
				ambilight
					? sampleFrameAmbilight(canvas, ctx, coreGeom, brightnessBoost)
					: sampleFrame(canvas, ctx, bounds, brightnessBoost)
			);
			if (onProgress) onProgress(i + 1, frameCount);
		}
		return { frames };
	} finally {
		URL.revokeObjectURL(url);
	}
}

// --- Animated images (GIF, animated WebP and PNG) ----------------------------
// These do not play in a <video> element. WebCodecs' ImageDecoder (Chrome,
// Edge) decodes them frame by frame, each frame with its own duration.

function isAnimatedImage(file) {
	return /^image\/(gif|webp|apng|png)$/.test(file.type) || /\.(gif|webp|apng)$/i.test(file.name);
}

// Browsers show a GIF frame with a delay under 20 ms for 100 ms; so does this.
const MIN_FRAME_SECONDS = 0.02;
const SHORT_FRAME_SECONDS = 0.1;

// Same options and result as extractFramesFromVideo(). One pass through
// the animation: duration is cut at its end (the badge loops it anyway).
async function extractFramesFromAnimatedImage(file, opts, onProgress, shouldAbort) {
	const { fps, startTime, duration, bounds, brightnessBoost, ambilight } = opts;
	if (typeof ImageDecoder === 'undefined') {
		throw new Error('this browser cannot decode animated images (no ImageDecoder): use Chrome or Edge');
	}
	const type = file.type || 'image/gif';
	if (!(await ImageDecoder.isTypeSupported(type))) throw new Error(`this browser cannot decode ${type}`);
	const decoder = new ImageDecoder({ data: await file.arrayBuffer(), type });
	try {
		await decoder.tracks.ready;
		await decoder.completed;
		const count = decoder.tracks.selectedTrack.frameCount;

		// when each source frame starts, in seconds
		const starts = [];
		let total = 0;
		for (let i = 0; i < count; i++) {
			const { image } = await decoder.decode({ frameIndex: i });
			const seconds = (image.duration ?? 0) / 1e6;
			image.close();
			starts.push(total);
			total += seconds >= MIN_FRAME_SECONDS ? seconds : SHORT_FRAME_SECONDS;
		}

		const clipDuration = Math.max(0, Math.min(duration, total - startTime));
		const frameCount = Math.max(1, Math.round(clipDuration * fps));
		const coreGeom = ambilight ? findCoreCircle(BOARD_DATA.leds) : null;
		const cropAspect = ambilight ? 1 : bounds.width / bounds.height;
		const canvas = document.createElement('canvas');
		canvas.width = SAMPLE_CANVAS_WIDTH;
		canvas.height = Math.max(1, Math.round(SAMPLE_CANVAS_WIDTH / cropAspect));
		const ctx = canvas.getContext('2d', { willReadFrequently: true });

		const frames = [];
		let source = 0;
		for (let k = 0; k < frameCount; k++) {
			if (shouldAbort && shouldAbort()) break;
			const t = startTime + k / fps;
			// (1 µs of slack: sums of frame delays do not round exactly, 0.1 + 0.2 > 0.3)
			while (source + 1 < count && starts[source + 1] <= t + 1e-6) source++;
			const { image } = await decoder.decode({ frameIndex: source });
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			drawCoverFit(image, canvas, ctx, cropAspect);
			image.close();
			frames.push(
				ambilight
					? sampleFrameAmbilight(canvas, ctx, coreGeom, brightnessBoost)
					: sampleFrame(canvas, ctx, bounds, brightnessBoost)
			);
			if (onProgress) onProgress(k + 1, frameCount);
		}
		return { frames };
	} finally {
		decoder.close();
	}
}
