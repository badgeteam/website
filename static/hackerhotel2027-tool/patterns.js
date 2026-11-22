// Pattern storage: browser localStorage, nothing device-side. A pattern is
// one or more 352-value frames (row*16+col brightness grids) plus a
// playback speed -- a single-frame pattern is just a static scene, a
// multi-frame one is a tiny flipbook animation.
'use strict';

const STORAGE_KEY = 'ledMatrixPatterns';
const PIXELS = MATRIX_ROWS * MATRIX_COLS;

function emptyFrame() {
	return new Array(PIXELS).fill(0);
}

function newPattern(name) {
	return {
		id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
		name,
		fps: 4,
		frames: [emptyFrame()],
		updatedAt: Date.now(),
	};
}

function listPatterns() {
	try {
		const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
		return Array.isArray(raw) ? raw : [];
	} catch (e) {
		console.error('corrupt pattern storage, resetting', e);
		return [];
	}
}

function saveAll(patterns) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
}

function savePattern(pattern) {
	pattern.updatedAt = Date.now();
	const patterns = listPatterns();
	const i = patterns.findIndex((p) => p.id === pattern.id);
	if (i >= 0) patterns[i] = pattern;
	else patterns.push(pattern);
	saveAll(patterns);
}

function deletePattern(id) {
	saveAll(listPatterns().filter((p) => p.id !== id));
}

function getPattern(id) {
	return listPatterns().find((p) => p.id === id) || null;
}

function isValidPattern(obj) {
	return (
		obj &&
		typeof obj.name === 'string' &&
		Array.isArray(obj.frames) &&
		obj.frames.length > 0 &&
		obj.frames.every((f) => Array.isArray(f) && f.length === PIXELS)
	);
}

function importPattern(jsonText) {
	const obj = JSON.parse(jsonText);
	if (!isValidPattern(obj)) throw new Error('not a valid LED matrix pattern file');
	const pattern = newPattern(obj.name);
	pattern.fps = Number(obj.fps) > 0 ? Number(obj.fps) : 4;
	pattern.frames = obj.frames.map((f) => f.map((v) => Math.max(0, Math.min(255, Number(v) | 0))));
	return pattern;
}

function exportPattern(pattern) {
	return JSON.stringify(
		{ name: pattern.name, fps: pattern.fps, frames: pattern.frames },
		null,
		'\t'
	);
}
