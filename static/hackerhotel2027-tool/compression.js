// Binary pattern compression for flash storage. Format spec and rationale:
// docs/ANIMATION_FORMAT.md -- deliberately simple (no general-purpose
// entropy coding) so a small on-device C decoder (pattern_player.c) stays
// easy to keep byte-for-byte in sync with this file, which is the
// reference implementation.
//
// LA02 is a fully bit-packed stream (see docs/ANIMATION_FORMAT.md): once
// past the 8-byte header, nothing is byte-aligned -- frame type, run
// lengths, indices and pixel values are all packed at exactly the width
// they need, back to back, with no padding until the very end of the
// file. This matters a lot at low quant_bits (the common case for an
// actually-long animation): LA01 spent a full byte per stored value
// regardless of bit depth, which is 8x bigger than it needs to be at
// quant_bits=1.
'use strict';

const LEDANIM_MAGIC = 'LA02';
const LEDANIM_PIXELS = MATRIX_ROWS * MATRIX_COLS;
// Bits needed to index any single cell (0..LEDANIM_PIXELS-1) or to store
// a run length (1..LEDANIM_PIXELS, biased by -1 so it fits the same
// width) -- smallest N with 2^N >= LEDANIM_PIXELS. Recomputed from
// LEDANIM_PIXELS rather than hardcoded so this file and pattern_player.c
// agree automatically if the matrix size ever changes again -- but
// pattern_player.c's INDEX_BITS is a compile-time constant, not computed
// the same way, so a mismatch would only be caught by testing, not the
// compiler. Both currently resolve to 9 (384 pixels).
const INDEX_BITS = Math.ceil(Math.log2(LEDANIM_PIXELS));

function quantize(value, bits) {
	if (bits >= 8) return value;
	const levels = (1 << bits) - 1;
	return Math.round((value / 255) * levels);
}

function dequantize(level, bits) {
	if (bits >= 8) return level;
	const levels = (1 << bits) - 1;
	return Math.round((level / levels) * 255);
}

// --- Bit-level I/O -----------------------------------------------------
// LSB-first within each byte (the first bit written/read is bit 0 of the
// first byte). Values up to 16 bits at a time -- nothing in this format
// ever needs more (quant_bits maxes out at 8, INDEX_BITS at 9 for any
// matrix up to 32768 pixels).

class BitWriter {
	constructor() {
		this.bytes = [];
		this.acc = 0;
		this.accBits = 0;
	}
	writeBits(value, n) {
		this.acc |= (value & ((1 << n) - 1)) << this.accBits;
		this.accBits += n;
		while (this.accBits >= 8) {
			this.bytes.push(this.acc & 0xff);
			this.acc >>>= 8;
			this.accBits -= 8;
		}
	}
	// Call once at the very end -- flushes a final partial byte (zero-padded).
	finish() {
		if (this.accBits > 0) {
			this.bytes.push(this.acc & 0xff);
			this.acc = 0;
			this.accBits = 0;
		}
		return this.bytes;
	}
	get bitLength() {
		return this.bytes.length * 8 + this.accBits;
	}
}

class BitReader {
	constructor(bytes, byteOffset) {
		this.bytes = bytes;
		this.bitPos = byteOffset * 8;
	}
	readBits(n) {
		let v = 0, got = 0;
		while (got < n) {
			const byteIdx = this.bitPos >> 3;
			const bitIdx = this.bitPos & 7;
			const avail = 8 - bitIdx;
			const take = Math.min(avail, n - got);
			const chunk = (this.bytes[byteIdx] >> bitIdx) & ((1 << take) - 1);
			v |= chunk << got;
			got += take;
			this.bitPos += take;
		}
		return v;
	}
}

// --- Per-frame-type size estimation + encoding --------------------------
// Frame type is a 2-bit field: 0=keyframe (RLE), 1=index-delta,
// 2=bitmap-delta, 3=raw. Frame 0 has no previous frame to delta against,
// so only keyframe/raw are considered for it.

function encodeKeyframeBits(writer, quant, quantBits) {
	writer.writeBits(0, 2);
	let i = 0;
	while (i < quant.length) {
		const v = quant[i];
		let run = 1;
		const maxRun = LEDANIM_PIXELS; // fits INDEX_BITS bits as (run-1)
		while (i + run < quant.length && quant[i + run] === v && run < maxRun) run++;
		writer.writeBits(run - 1, INDEX_BITS);
		writer.writeBits(v, quantBits);
		i += run;
	}
}

function keyframeBitCost(quant, quantBits) {
	let bits = 2;
	let i = 0;
	while (i < quant.length) {
		const v = quant[i];
		let run = 1;
		while (i + run < quant.length && quant[i + run] === v && run < LEDANIM_PIXELS) run++;
		bits += INDEX_BITS + quantBits;
		i += run;
	}
	return bits;
}

function decodeKeyframeBits(reader, out, quantBits) {
	let vi = 0;
	while (vi < out.length) {
		const run = reader.readBits(INDEX_BITS) + 1;
		const v = reader.readBits(quantBits);
		for (let k = 0; k < run && vi < out.length; k++) out[vi++] = v;
	}
}

function computeChanges(quant, prev) {
	const changes = [];
	for (let i = 0; i < quant.length; i++)
		if (quant[i] !== prev[i]) changes.push(i);
	return changes;
}

function indexDeltaBitCost(changes, quantBits) {
	return 2 + INDEX_BITS + changes.length * (INDEX_BITS + quantBits);
}

function encodeIndexDeltaBits(writer, quant, changes, quantBits) {
	writer.writeBits(1, 2);
	writer.writeBits(changes.length, INDEX_BITS);
	for (const idx of changes) {
		writer.writeBits(idx, INDEX_BITS);
		writer.writeBits(quant[idx], quantBits);
	}
}

function decodeIndexDeltaBits(reader, out, quantBits) {
	const count = reader.readBits(INDEX_BITS);
	for (let c = 0; c < count; c++) {
		const idx = reader.readBits(INDEX_BITS);
		const v = reader.readBits(quantBits);
		out[idx] = v;
	}
}

function bitmapDeltaBitCost(changes, quantBits) {
	return 2 + LEDANIM_PIXELS + changes.length * quantBits;
}

function encodeBitmapDeltaBits(writer, quant, changes, quantBits) {
	writer.writeBits(2, 2);
	const changeSet = new Set(changes);
	for (let i = 0; i < LEDANIM_PIXELS; i++) writer.writeBits(changeSet.has(i) ? 1 : 0, 1);
	for (const idx of changes) writer.writeBits(quant[idx], quantBits);
}

function decodeBitmapDeltaBits(reader, out, quantBits) {
	const changedIdx = [];
	for (let i = 0; i < LEDANIM_PIXELS; i++) if (reader.readBits(1)) changedIdx.push(i);
	for (const idx of changedIdx) out[idx] = reader.readBits(quantBits);
}

function rawBitCost(quantBits) {
	return 2 + LEDANIM_PIXELS * quantBits;
}

function encodeRawBits(writer, quant, quantBits) {
	writer.writeBits(3, 2);
	for (const v of quant) writer.writeBits(v, quantBits);
}

function decodeRawBits(reader, out, quantBits) {
	for (let i = 0; i < out.length; i++) out[i] = reader.readBits(quantBits);
}

// pattern: {fps, frames: [[LEDANIM_PIXELS ints], ...]}. opts.quantBits: 8
// (lossless), 4, 2, or 1 -- see docs/ANIMATION_FORMAT.md.
function compressPattern(pattern, { quantBits = 8 } = {}) {
	if (pattern.frames.some((f) => f.length !== LEDANIM_PIXELS)) {
		throw new Error(`every frame must have exactly ${LEDANIM_PIXELS} values`);
	}
	const frameCount = pattern.frames.length;
	if (frameCount > 0xffff) throw new Error('too many frames (max 65535)');

	const quantFrames = pattern.frames.map((f) => f.map((v) => quantize(v, quantBits)));

	const header = new Uint8Array(8);
	for (let i = 0; i < 4; i++) header[i] = LEDANIM_MAGIC.charCodeAt(i);
	header[4] = frameCount & 0xff;
	header[5] = (frameCount >> 8) & 0xff;
	header[6] = Math.max(1, Math.min(255, Math.round(pattern.fps || 4)));
	header[7] = quantBits;

	const writer = new BitWriter();
	let prev = null;
	for (const quant of quantFrames) {
		const keyCost = keyframeBitCost(quant, quantBits);
		const rawCost = rawBitCost(quantBits);
		let bestCost = Math.min(keyCost, rawCost);
		let best = keyCost <= rawCost ? 'key' : 'raw';

		let changes = null;
		if (prev) {
			changes = computeChanges(quant, prev);
			const idxCost = indexDeltaBitCost(changes, quantBits);
			const bmpCost = bitmapDeltaBitCost(changes, quantBits);
			if (idxCost < bestCost) { bestCost = idxCost; best = 'idx'; }
			if (bmpCost < bestCost) { bestCost = bmpCost; best = 'bmp'; }
		}

		if (best === 'key') encodeKeyframeBits(writer, quant, quantBits);
		else if (best === 'raw') encodeRawBits(writer, quant, quantBits);
		else if (best === 'idx') encodeIndexDeltaBits(writer, quant, changes, quantBits);
		else encodeBitmapDeltaBits(writer, quant, changes, quantBits);

		prev = quant;
	}

	const body = writer.finish();
	const out = new Uint8Array(8 + body.length);
	out.set(header, 0);
	out.set(body, 8);
	return out;
}

// Returns {fps, quantBits, frames: [[LEDANIM_PIXELS ints], ...]}.
function decompressPattern(bytes) {
	const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
	if (magic !== LEDANIM_MAGIC) throw new Error('not a .ledanim file (bad magic bytes, or an old LA01 file -- that format is no longer supported)');
	const frameCount = bytes[4] | (bytes[5] << 8);
	const fps = bytes[6];
	const quantBits = bytes[7];

	const reader = new BitReader(bytes, 8);
	let quant = new Array(LEDANIM_PIXELS).fill(0);
	const frames = [];
	for (let f = 0; f < frameCount; f++) {
		const type = reader.readBits(2);
		if (type === 0) decodeKeyframeBits(reader, quant, quantBits);
		else if (type === 3) decodeRawBits(reader, quant, quantBits);
		else if (type === 1) decodeIndexDeltaBits(reader, quant, quantBits);
		else decodeBitmapDeltaBits(reader, quant, quantBits);
		frames.push(quant.map((v) => dequantize(v, quantBits)));
	}
	return { fps, quantBits, frames };
}
