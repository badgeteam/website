// The .ledanim animation format, LA04: the encoder (compressPattern) and a
// reference decoder (decompressPattern). The badge's decoder is la04.c; the
// two must match bit for bit. Format and rationale: docs/ANIMATION_FORMAT.md.
//
// In short: the LEDs go in LAYOUT_ORDER (layout_data.js): the centre grid
// row by row, the outline, then the RGB LEDs. A frame is three segments (the
// grid, the outline, RGB). Each segment of each frame picks one prediction
// mode (the previous frame, a motion, a spatial neighbour, ...), and what
// the prediction gets wrong goes as Huffman-coded tokens: runs of correct
// values and residuals. The Huffman tables are per file, in the header, so
// the badge reads them once and then only does table lookups per frame.
// The encoder tries every mode for every segment and rebuilds the tables a
// few times: it is slow (up to seconds), so the web interface runs it in a
// worker (compression_worker.js).
//
// Needs LAYOUT_ORDER, LAYOUT_GRID and LAYOUT_GAMMA (layout_data.js). Also
// runs in node (tools/codec_test).
'use strict';

const LEDANIM_MAGIC = 'LA04';
const LEDANIM_PIXELS = 384;

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

const { compressPattern, decompressPattern } = (() => {
	const N = 384, NG = 208, NE = 71;
	const OPT = {
		resDirect: 8, // residual bins: values x < resDirect are their own symbol
		runDirect: 8, // run bins
		maxTables: 16, // token tables at most
		maxLen: 12, // the longest Huffman code
		tmax: 32, // listed tuples at most (the others: escape)
		tmin: 2, // a tuple is listed if it is used at least tmin times
		iters: 4, // mode choice / table rebuild passes
		ttMaxQ: 8, // the transition table mode X for q <= ttMaxQ
		ttMin: 3, // q <= 4: a table entry differs from the default if its value is that much more frequent
		ttMin8: 16, // q = 8: if the median saves that many bits (estimated)
		actIter: 1, // choose the activity thresholds at this pass
		ctxThr: 2, // residual context: z <= ctxThr is "small"
		gridModes: 'Z,T,V,S,G,L,R,U,D,P,X',
		edgeModes: 'Z,T,V,S,G,+1,-1,+2,-2,+3,-3,P,X',
		rgbModes: 'Z,T,V,S,G,A,B,P,X',
		cls: 'T:0,V:1,X:1,S:2,A:2,G:3,B:3', // mode -> family (the motions are family 0)
	};

	// --- The layout -------------------------------------------------------
	const POS_OF_SLOT = new Array(N);
	LAYOUT_ORDER.forEach((s, i) => (POS_OF_SLOT[s] = i));
	const PGRID = LAYOUT_GRID.map((r) => r.map((s) => (s === null ? -1 : POS_OF_SLOT[s])));
	const GH = PGRID.length, GW = PGRID[0].length;
	const GX = new Int8Array(NG), GY = new Int8Array(NG);
	for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (PGRID[y][x] >= 0) { GX[PGRID[y][x]] = x; GY[PGRID[y][x]] = y; }
	// the spatial neighbour of each position (already decoded in this frame), -1 none
	const NBR = new Int16Array(N).fill(-1);
	for (let p = 0; p < NG; p++) {
		const x = GX[p], y = GY[p];
		if (x > 0 && PGRID[y][x - 1] >= 0) NBR[p] = PGRID[y][x - 1];
		else if (y > 0 && PGRID[y - 1][x] >= 0) NBR[p] = PGRID[y - 1][x];
	}
	for (let p = NG + 1; p < NG + NE; p++) NBR[p] = p - 1;
	for (let p = NG + NE; p < N; p++) NBR[p] = p - NG - NE >= 3 ? p - 3 : p > NG + NE ? p - 1 : -1;
	const NBR_ARM = new Int16Array(N).fill(-1); // the same LED rank and colour on the previous arm
	for (let p = NG + NE + 21; p < N; p++) NBR_ARM[p] = p - 21;

	const SEGS = [{ start: 0, len: NG, modes: OPT.gridModes.split(','), cs: 0 },
		{ start: NG, len: NE, modes: OPT.edgeModes.split(','), cs: 1 },
		{ start: NG + NE, len: N - NG - NE, modes: OPT.rgbModes.split(','), cs: 2 }];
	const GSHIFT = { L: [1, 0], R: [-1, 0], U: [0, 1], D: [0, -1] };
	// the source position in the previous frame for a motion mode, -1: the value 0
	function src(mode, p) {
		if (GSHIFT[mode]) {
			const [dx, dy] = GSHIFT[mode], x = GX[p] + dx, y = GY[p] + dy;
			return y >= 0 && y < GH && x >= 0 && x < GW ? PGRID[y][x] : -1;
		}
		const k = +mode; // outline rotation: the picture moves k LEDs clockwise
		return NG + ((p - NG - k) % NE + NE) % NE;
	}
	const MODE_FAM = Object.fromEntries(OPT.cls.split(',').map((s) => s.split(':')).map(([m, c]) => [m, +c]));
	const NFAM = 4;
	const NCTX = 16;
	const UPN = new Int16Array(N).fill(-1);
	for (let p = 0; p < NG; p++) if (GY[p] > 0) UPN[p] = PGRID[GY[p] - 1][GX[p]];
	for (let p = NG + NE + 3; p < N; p++) UPN[p] = p - 3;

	// The state of the file being coded
	let TT = null, TS = 0, TK = 0, TKIND = 0; // the transition table: key (ttKey) -> delta to prev
	let ACT = null; // the activity thresholds (null: T/U contexts)

	// The raw context of a token at position p: base | T << 2 | U << 3 |
	// activity << 4. base: 0 after a run, 1 after a small residual, 2 after a
	// large one, 3 at the segment start. T: the position changed in the
	// previous frame (prev != prev2); U: the position above changed in this
	// frame. Activity: |prev - prev2| + |cur - prev| above.
	function rawCtx(base, p, prev, prev2, cur) {
		const u = UPN[p], d = prev[p] - prev2[p], e = u >= 0 ? cur[u] - prev[u] : 0;
		return base | (d ? 4 : 0) | (e ? 8 : 0) | (Math.abs(d) + Math.abs(e)) << 4;
	}
	// the context (0..15) of a raw context: base + 4 T + 8 U, or base + 4 *
	// the number of activity thresholds below the activity
	function ctxOf(raw) {
		if (!ACT) return raw & 15;
		let c = raw & 3;
		const a = raw >> 4;
		for (let i = 0; i < ACT.length; i++) if (a > ACT[i]) c += 4;
		return c;
	}
	const NLOG = 3 * NFAM * NCTX; // logical contexts: segment x family x context
	const logical = (seg, mode, ctx) => (SEGS[seg].cs * NFAM + (MODE_FAM[mode] ?? 0)) * NCTX + ctx;
	const clamp = (v, m) => (v < 0 ? 0 : v > m ? m : v);
	// the prediction of position p
	function pred(mode, p, cur, prev, prev2, m) {
		switch (mode) {
			case 'T': case 'Z': return prev[p];
			case 'V': return clamp(2 * prev[p] - prev2[p], m);
			case 'P': return prev2[p];
			case 'X': { const a = prev[p]; return clamp(a + TT[ttKey(a, prev2[p])], m); }
			case 'S': return NBR[p] < 0 ? 0 : cur[NBR[p]];
			case 'A': return NBR_ARM[p] < 0 ? (NBR[p] < 0 ? 0 : cur[NBR[p]]) : cur[NBR_ARM[p]];
			case 'G': return NBR[p] < 0 ? prev[p] : clamp(prev[p] + cur[NBR[p]] - prev[NBR[p]], m);
			case 'B': { const n = NBR_ARM[p] < 0 ? NBR[p] : NBR_ARM[p]; return n < 0 ? prev[p] : clamp(prev[p] + cur[n] - prev[n], m); }
			default: { const s = src(mode, p); return s < 0 ? 0 : prev[s]; }
		}
	}

	// --- Bins ---------------------------------------------------------------
	function mkBin(D) {
		const LD = Math.log2(D);
		return {
			bin(x) { // x >= 0 -> [sym, nExtra, extra]
				if (x < D) return [x, 0, 0];
				const n = 31 - Math.clz32(x);
				return [D + 2 * (n - LD) + ((x >> (n - 1)) & 1), n - 1, x & ((1 << (n - 1)) - 1)];
			},
			base(s) { // sym -> [base, nExtra]
				if (s < D) return [s, 0];
				const n = LD + ((s - D) >> 1);
				return [(1 << n) | (((s - D) & 1) << (n - 1)), n - 1];
			},
			count(maxX) { return maxX < 0 ? 0 : this.bin(maxX)[0] + 1; },
		};
	}
	const RES = mkBin(OPT.resDirect), RUN = mkBin(OPT.runDirect), HOLD = mkBin(8);
	const HOLD_SYMS = HOLD.count(65534);
	// the token alphabet: [residual bins][run bins][end of segment]
	function alphabet(q) {
		const nres = RES.count((1 << q) - 2), nrun = RUN.count(NG - 2);
		return { nres, nj: nres, size: nres + nrun + 1, eob: nres + nrun };
	}

	// --- Bits (most significant first) --------------------------------------
	class BW {
		constructor() { this.b = []; this.acc = 0; this.n = 0; }
		put(v, n) { for (let i = n - 1; i >= 0; i--) this.bit((v >> i) & 1); }
		bit(b) { this.acc |= b << (7 - this.n); if (++this.n === 8) { this.b.push(this.acc); this.acc = 0; this.n = 0; } }
		get bits() { return this.b.length * 8 + this.n; }
		finish() { if (this.n) this.b.push(this.acc); return this.b; }
	}
	class BR {
		constructor(bytes, off) { this.d = bytes; this.p = off * 8; }
		bit() { const b = ((this.d[this.p >> 3] ?? 0) >> (7 - (this.p & 7))) & 1; this.p++; return b; }
		get(n) { let v = 0; for (let i = 0; i < n; i++) v = (v << 1) | this.bit(); return v; }
	}
	const nbitsFor = (n) => (n <= 1 ? 0 : 32 - Math.clz32(n - 1)); // bits for a value 0..n-1

	// --- Huffman ------------------------------------------------------------
	// package-merge: length-limited code lengths
	function codeLengths(freq, maxLen) {
		const syms = [];
		freq.forEach((f, s) => f > 0 && syms.push(s));
		const len = new Array(freq.length).fill(0);
		if (syms.length === 0) return len;
		if (syms.length === 1) { len[syms[0]] = 1; return len; } // one symbol: 0 bits in the stream
		const leaves = syms.map((s) => ({ w: freq[s], s: [s] })).sort((a, b) => a.w - b.w);
		let list = leaves.slice();
		for (let l = 1; l < maxLen; l++) {
			const pk = [];
			for (let i = 0; i + 1 < list.length; i += 2) pk.push({ w: list[i].w + list[i + 1].w, s: list[i].s.concat(list[i + 1].s) });
			list = leaves.concat(pk).sort((a, b) => a.w - b.w);
		}
		const take = list.slice(0, 2 * syms.length - 2);
		for (const it of take) for (const s of it.s) len[s]++;
		return len;
	}
	// canonical codes; the first code bit is written first
	function canon(len) {
		const maxL = Math.max(0, ...len), codes = new Array(len.length).fill(0);
		let code = 0;
		for (let l = 1; l <= maxL; l++) {
			for (let s = 0; s < len.length; s++) if (len[s] === l) codes[s] = code++;
			code <<= 1;
		}
		return codes;
	}
	function single(len) { return len.filter((l) => l > 0).length === 1; }
	function putSym(w, t, s) {
		const l = t.len[s];
		if (!l) throw new Error('symbol not in table');
		if (t.single) return;
		for (let i = l - 1; i >= 0; i--) w.bit((t.codes[s] >> i) & 1);
	}
	function makeTable(len) { return { len, codes: canon(len), single: single(len) }; }
	function readSym(r, t) {
		if (t.single) return t.sym[0];
		let code = 0, first = 0, idx = 0;
		for (let l = 1; l <= 16; l++) {
			code |= r.bit();
			const c = t.cnt[l];
			if (code - first < c) return t.sym[idx + code - first];
			idx += c; first = (first + c) << 1; code <<= 1;
		}
		throw new Error('bad code');
	}
	function decTable(len) {
		const cnt = new Array(16).fill(0), sym = [];
		for (let l = 1; l <= 15; l++) for (let s = 0; s < len.length; s++) if (len[s] === l) { cnt[l]++; sym.push(s); }
		return { cnt, sym, single: single(len) };
	}
	// Code lengths in the header: the index e of the last used symbol, then
	// events up to it, against p (the last nonzero length, first 0):
	//   '00' length p, '01' p + 1, '110' p - 1, '1110' p + 2, '1111' p - 2,
	//   '101' + 4 bits a new length, '100' + gamma(n) n unused symbols (length 0)
	function lastUsed(len) { let k = len.length - 1; while (k > 0 && !len[k]) k--; return k; }
	function lensEvents(len, w) { // writes if w, returns the bits
		const e = lastUsed(len), nb = nbitsFor(len.length);
		let b = nb, p = 0;
		if (w) w.put(e, nb);
		for (let i = 0; i <= e;) {
			if (!len[i]) {
				let n = 0;
				while (i <= e && !len[i]) n++, i++;
				b += 3 + 2 * (31 - Math.clz32(n)) + 1;
				if (w) { w.put(4, 3); putGamma(w, n); }
				continue;
			}
			const d = len[i] - p;
			const c = d === 0 ? [0, 2] : d === 1 ? [1, 2] : d === -1 ? [6, 3] : d === 2 ? [14, 4] : d === -2 ? [15, 4] : [5 << 4 | len[i], 7];
			b += c[1];
			if (w) w.put(c[0], c[1]);
			p = len[i++];
		}
		return b;
	}
	function putLens(w, len) { lensEvents(len, w); }
	function getLens(r, n) {
		const e = r.get(nbitsFor(n)), len = new Array(n).fill(0);
		let p = 0;
		for (let i = 0; i <= e;) {
			if (!r.bit()) { p += r.bit() ? 1 : 0; len[i++] = p; continue; }
			if (!r.bit()) { if (r.bit()) p = r.get(4); else { i += getGamma(r); continue; } len[i++] = p; continue; }
			if (!r.bit()) p -= 1; else p += r.bit() ? -2 : 2;
			len[i++] = p;
		}
		return len;
	}
	// Elias gamma of n >= 1
	function putGamma(w, n) { const k = 31 - Math.clz32(n); w.put(0, k); w.bit(1); w.put(n - (1 << k), k); }
	function getGamma(r) { let k = 0; while (!r.bit() && k < 32) k++; return (1 << k) + r.get(k); }
	// plain Huffman lengths (no limit), for estimates: two-queue Huffman
	function quickLengths(freq) {
		const len = new Array(freq.length).fill(0);
		const syms = [];
		freq.forEach((f, s) => f > 0 && syms.push(s));
		const m = syms.length;
		if (m === 0) return len;
		if (m === 1) { len[syms[0]] = 1; return len; }
		syms.sort((a, b) => freq[a] - freq[b]);
		const w = new Float64Array(2 * m - 1), par = new Int32Array(2 * m - 1), dep = new Int32Array(2 * m - 1);
		for (let i = 0; i < m; i++) w[i] = freq[syms[i]];
		let li = 0, ii = m;
		const pop = () => (li < m && (ii >= nx || w[li] <= w[ii]) ? li++ : ii++);
		let nx = m;
		for (; nx < 2 * m - 1; nx++) { const a = pop(), b = pop(); w[nx] = w[a] + w[b]; par[a] = par[b] = nx; }
		for (let i = 2 * m - 3; i >= 0; i--) dep[i] = dep[par[i]] + 1;
		for (let i = 0; i < m; i++) len[syms[i]] = dep[i];
		return len;
	}
	// the cost in bits of coding freq with its own Huffman code, plus its lengths
	function huffCost(freq) {
		const len = quickLengths(freq);
		let b = lensEvents(len, null);
		if (!single(len)) for (let s = 0; s < freq.length; s++) b += freq[s] * len[s];
		return b;
	}
	// greedy merging of the logical contexts into at most maxTables tables
	function cluster(freqs) {
		let cl = [], serial = 0;
		freqs.forEach((f, i) => { if (f.some((v) => v)) cl.push({ id: serial++, ids: [i], f: f.slice(), c: huffCost(f) }); });
		const pair = new Map();
		const key = (a, b) => a.id + ',' + b.id;
		for (;;) {
			let best = null, gain = cl.length > OPT.maxTables ? -Infinity : 0;
			for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) {
				const k = key(cl[i], cl[j]);
				let e = pair.get(k);
				if (!e) { const f = cl[i].f.map((v, s) => v + cl[j].f[s]); e = { f, c: huffCost(f) }; pair.set(k, e); }
				const g = cl[i].c + cl[j].c - e.c;
				if (g > gain) { gain = g; best = [i, j, e]; }
			}
			if (!best) break;
			const [i, j, e] = best;
			const m = { id: serial++, ids: cl[i].ids.concat(cl[j].ids), f: e.f, c: e.c };
			cl = cl.filter((_, k) => k !== i && k !== j);
			cl.push(m);
		}
		const map = new Array(freqs.length).fill(-1);
		cl.forEach((c, t) => c.ids.forEach((i) => (map[i] = t)));
		return { map, freqs: cl.map((c) => c.f) };
	}

	// The map of one family (16 contexts c): '1' if every entry is the
	// previous coded entry, else '0' and per entry: '0' the first candidate,
	// '10' the second, '11' + bits the table. The candidates (distinct, in
	// this order): the entry of c - 8, of c - 4, the previous coded entry.
	// Free (-1) entries take the first candidate. With one table or none
	// nothing is coded.
	function mapFamily(map, o, ntab, pmr, w, r) {
		const tb = nbitsFor(ntab);
		if (ntab <= 1) { for (let c = 0; c < NCTX; c++) map[o + c] = 0; return; }
		let uni;
		if (w) { uni = true; for (let c = 0; c < NCTX; c++) if (map[o + c] >= 0 && map[o + c] !== pmr.pm) uni = false; w.bit(uni ? 1 : 0); }
		else uni = r.bit();
		if (uni) { for (let c = 0; c < NCTX; c++) map[o + c] = pmr.pm; return; }
		for (let c = 0; c < NCTX; c++) {
			const cand = [];
			for (const v of [c >= 8 ? map[o + c - 8] : -1, c >= 4 ? map[o + c - 4] : -1, pmr.pm]) if (v >= 0 && !cand.includes(v) && cand.length < 2) cand.push(v);
			if (w) {
				if (map[o + c] < 0) map[o + c] = cand[0];
				const i = cand.indexOf(map[o + c]);
				if (i === 0) w.bit(0); else if (i === 1) w.put(2, 2); else { w.put(3, 2); w.put(map[o + c], tb); }
			} else {
				map[o + c] = !r.bit() ? cand[0] : !r.bit() ? cand[1] : r.get(tb);
			}
			pmr.pm = map[o + c];
		}
	}

	// --- Tokens ---------------------------------------------------------------
	function zz(r, q) { // a residual mod 2^q -> zigzag
		const m = (1 << q) - 1, h = 1 << (q - 1);
		r &= m;
		const s = r >= h ? r - (1 << q) : r;
		return s >= 0 ? 2 * s : -2 * s - 1;
	}
	function unzz(z) { return z & 1 ? -((z + 1) >> 1) : z >> 1; }

	const SPATIAL = new Set(['S', 'G', 'A', 'B']);
	// The scan order of a segment under a mode: the grid shifts first visit
	// the positions that come into the picture (no source in the previous
	// frame), then the others; every other mode visits the positions in order
	const ORDER = {};
	for (const mode of ['L', 'R', 'U', 'D']) {
		const all = Array.from({ length: NG }, (_, p) => p);
		ORDER[mode] = all.filter((p) => src(mode, p) < 0).concat(all.filter((p) => src(mode, p) >= 0));
	}
	function scanOrder(seg, mode) {
		const S = SEGS[seg];
		if (ORDER[mode] && seg === 0) return ORDER[mode];
		return Array.from({ length: S.len }, (_, i) => S.start + i);
	}
	// The tokens of one segment under one mode: [{raw, sym, ne, ex}]. The
	// temporal modes: the decoder fills the segment with the prediction
	// first, so a context sees the prediction at positions not yet decoded
	// (the work buffer wb).
	function tokenize(seg, mode, cur, prev, prev2, q, A) {
		const m = (1 << q) - 1, S = SEGS[seg];
		const toks = [];
		if (mode === 'X' && !TT) return null;
		if (mode === 'Z') {
			for (let p = S.start; p < S.start + S.len; p++) if (cur[p] !== prev[p]) return null;
			return toks;
		}
		const ord = scanOrder(seg, mode), sp = SPATIAL.has(mode);
		let wb = cur;
		if (!sp) { wb = cur.slice(); for (const p of ord) wb[p] = pred(mode, p, cur, prev, prev2, m); }
		let ctx = 3, run = 0, rs = 0;
		for (const p of ord) {
			const z = zz(cur[p] - pred(mode, p, cur, prev, prev2, m), q);
			if (z === 0) { if (!run) rs = p; run++; continue; }
			const [s, ne, ex] = RES.bin(z - 1);
			if (run) { const [s, ne, ex] = RUN.bin(run - 1); toks.push({ raw: rawCtx(ctx, rs, prev, prev2, wb), sym: A.nj + s, ne, ex }); ctx = 0; }
			toks.push({ raw: rawCtx(ctx, p, prev, prev2, wb), sym: s, ne, ex });
			wb[p] = cur[p];
			run = 0;
			ctx = z <= OPT.ctxThr ? 1 : 2;
		}
		if (run) toks.push({ raw: rawCtx(ctx, rs, prev, prev2, wb), sym: A.eob, ne: 0, ex: 0 });
		return toks;
	}

	const same = (a, b) => a.every((v, i) => v === b[i]);

	// The activity thresholds for the chosen tokens (or null: T/U contexts),
	// by the empirical entropy of the symbols per context plus 3 bits per
	// used symbol
	const ACT_V = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192, 256, 320, 384];
	function actSearch(choice, q, A) {
		const inf = (1 << (q + 1)) - 1, V = ACT_V.filter((v) => v < inf - 1).concat([inf]), NV = V.length + 1;
		const iv = new Int32Array(inf + 1);
		for (let a = 0; a <= inf; a++) { let k = 0; while (k < V.length && V[k] < a) k++; iv[a] = k; }
		const NF = 3 * NFAM, H = new Float64Array(NF * 4 * NV * A.size), HT = new Float64Array(NF * 16 * A.size);
		for (const segs of choice) if (!segs.hold) segs.forEach((c, si) => {
			const f = SEGS[si].cs * NFAM + (MODE_FAM[c.mode] ?? 0);
			for (const t of c.toks) {
				H[((f * 4 + (t.raw & 3)) * NV + iv[t.raw >> 4]) * A.size + t.sym]++;
				HT[(f * 16 + (t.raw & 15)) * A.size + t.sym]++;
			}
		});
		const ent = (cnt) => { let tot = 0, e = 0, u = 0; for (const v of cnt) if (v) { tot += v; u++; } for (const v of cnt) if (v) e += v * Math.log2(tot / v); return e + 3 * u; };
		let costTU = 0;
		for (let k = 0; k < NF * 16; k++) costTU += ent(HT.subarray(k * A.size, (k + 1) * A.size));
		const cost = (ks) => {
			let c = 0;
			const acc = Array.from({ length: 4 }, () => new Float64Array(A.size));
			for (let fb = 0; fb < NF * 4; fb++) {
				acc.forEach((x) => x.fill(0));
				for (let v = 0; v < NV; v++) {
					let b = 0;
					for (const k of ks) if (v > k) b++;
					const o = (fb * NV + v) * A.size, x = acc[b];
					for (let sy = 0; sy < A.size; sy++) x[sy] += H[o + sy];
				}
				for (const x of acc) c += ent(x);
			}
			return c;
		};
		let ks = [0, Math.min(2, V.length - 1), Math.min(6, V.length - 1)], best = cost(ks);
		for (let round = 0; round < 3; round++) {
			let moved = false;
			for (let i = 0; i < 3; i++) for (let k = 0; k < V.length; k++) {
				if (k === ks[i] || (i > 0 && k < ks[i - 1]) || (i < 2 && k > ks[i + 1])) continue;
				const t = ks.slice(); t[i] = k;
				const c = cost(t);
				if (c < best - 1e-9) { best = c; ks = t; moved = true; }
			}
			if (!moved) break;
		}
		return best < costTU ? ks.map((k) => V[k]) : null;
	}

	// The transition table in the header: runs of entries that hold the
	// default delta (V at the key's centre, ttDefault), each run as
	// gamma(length + 1), then (if the table is not complete) one other entry:
	// '0' delta 0, '1' + the delta in min(q + 1, 8) bits (two's complement)
	function ttSetQ(q) { TK = Math.min(q, 4); TS = q - TK; }
	// the delta bin of kind 1: 0, then 1..7 for |d| in [1], [2, 3], [4, 7],
	// ... [64, 255], + 7 if d < 0; DREP: a delta of each magnitude bin
	const DREP = [0, 1, 2, 5, 11, 23, 47, 100, 0]; // [8]: key 15 is not used
	function dbin(d) { const a = Math.abs(d), b = a === 0 ? 0 : Math.min(7, 32 - Math.clz32(a)); return d < 0 && b ? 7 + b : b; }
	// the key of kind 0: (prev >> TS) << TK | prev2 >> TS; kind 1 (q = 8):
	// prev >> 4 << 4 | dbin(prev - prev2)
	function ttKey(a, b) { return TKIND ? (a >> 4) << 4 | dbin(a - b) : (a >> TS) << TK | b >> TS; }
	function ttDefault(k, q) {
		const m = (1 << q) - 1, h = TS ? 1 << (TS - 1) : 0, A = (k >> TK << TS) + h, lo = k & ((1 << TK) - 1);
		const B = TKIND ? A - (lo > 7 ? -DREP[lo - 7] : DREP[lo]) : (lo << TS) + h;
		return Math.max(-128, Math.min(127, clamp(2 * A - B, m) - A));
	}
	function putTT(w, q) {
		const lb = Math.min(q + 1, 8), n = TT.length;
		for (let k = 0; k < n; k++) {
			let run = 0;
			while (k + run < n && TT[k + run] === ttDefault(k + run, q)) run++;
			putGamma(w, run + 1);
			k += run;
			if (k >= n) break;
			if (TT[k] === 0) w.bit(0);
			else { w.bit(1); w.put(TT[k] & ((1 << lb) - 1), lb); }
		}
	}
	function getTT(r, q) {
		const n = 1 << 2 * TK, t = new Int32Array(n), lb = Math.min(q + 1, 8);
		for (let k = 0; k < n; k++) {
			for (let run = getGamma(r) - 1; run > 0; run--, k++) t[k] = ttDefault(k, q);
			if (k >= n) break;
			t[k] = !r.bit() ? 0 : (r.get(lb) << (32 - lb)) >> (32 - lb);
		}
		return t;
	}

	// The transition table of kind TKIND for the frames, and its estimated
	// cost (the sum of log2(|residual| + 1) over all positions)
	function buildTT(frames, zero, q) {
		const K = 1 << 2 * TK, lists = Array.from({ length: K }, () => []);
		for (let fi = 0; fi < frames.length; fi++) {
			const a = fi > 0 ? frames[fi - 1] : zero, b = fi > 1 ? frames[fi - 2] : zero, c = frames[fi];
			for (let i = 0; i < N; i++) lists[ttKey(a[i], b[i])].push(c[i] - a[i]);
		}
		const tt = new Int32Array(K);
		let cost = 0;
		for (let k = 0; k < K; k++) {
			const l = lists[k], d0 = ttDefault(k, q);
			let d = d0;
			if (!l.length) { tt[k] = d; continue; }
			if (!TS) { // the most frequent value, if it is enough more frequent than the default's
				const cnt = new Map();
				for (const v of l) cnt.set(v, (cnt.get(v) || 0) + 1);
				let bc = (cnt.get(d0) || 0) + OPT.ttMin;
				for (const [v, c] of cnt) if (c >= bc) { bc = c; d = v; }
			} else { // the median, if it pays (bits ~ log2(|residual| + 1))
				l.sort((x, y) => x - y);
				const dm = Math.max(-128, Math.min(127, l[l.length >> 1]));
				let gain = 0;
				for (const v of l) gain += Math.log2(Math.abs(v - d0) + 1) - Math.log2(Math.abs(v - dm) + 1);
				if (gain >= OPT.ttMin8) d = dm;
			}
			tt[k] = d;
			for (const v of l) cost += Math.log2(Math.abs(v - d) + 1);
		}
		return { tt, cost, kind: TKIND };
	}

	// q = 8: a value may become any value with the same PWM duty
	// (LAYOUT_GAMMA): the badge shows those exactly alike, at every
	// brightness. Two ways to use that; neither wins on every animation.
	// keepDuty: each LED keeps its previous value while that shows the same
	// (fewer changes). lowestDuty: every value becomes the lowest one of its
	// duty (fewer distinct values; motion stays exact).
	function keepDuty(frames) {
		const last = new Array(N).fill(0);
		return frames.map((f) => f.map((v, i) => (LAYOUT_GAMMA[v] === LAYOUT_GAMMA[last[i]] ? last[i] : (last[i] = v))));
	}
	function lowestDuty(frames) {
		const low = LAYOUT_GAMMA.map((g) => LAYOUT_GAMMA.indexOf(g));
		return frames.map((f) => f.map((v) => low[v]));
	}

	function encodeWith(frames, fps, q, useTT) {
		const A = alphabet(q);
		const zero = new Array(N).fill(0);
		// The transition table: per key (prev >> TS, prev2 >> TS) a delta to
		// prev; for q <= 4 (TS = 0) the delta to the most frequent next value,
		// else the median
		ttSetQ(q);
		TT = null;
		TKIND = 0;
		if (useTT && q <= OPT.ttMaxQ) {
			let best = null;
			for (const kind of q === 8 ? [0, 1] : [0]) {
				TKIND = kind;
				const t = buildTT(frames, zero, q);
				if (!best || t.cost < best.cost) best = t;
			}
			TT = best.tt;
			TKIND = best.kind;
		}
		const P = (fi) => (fi > 0 ? frames[fi - 1] : zero), P2 = (fi) => (fi > 1 ? frames[fi - 2] : zero);
		// The frame items: {hold: n} for n frames equal to the previous one, or
		// per segment the candidate modes with their tokens
		const items = [];
		for (let fi = 0; fi < frames.length;) {
			let n = 0;
			while (fi + n < frames.length && same(frames[fi + n], P(fi + n))) n++;
			if (n) { items.push({ hold: n }); fi += n; continue; }
			const cur = frames[fi];
			items.push({ segs: SEGS.map((S, si) => S.modes.map((mode, mi) => ({ mode, mi, toks: tokenize(si, mode, cur, P(fi), P2(fi), q, A) })).filter((c) => c.toks)) });
			fi++;
		}
		const allToks = [];
		for (const it of items) if (!it.hold) for (const cs of it.segs) for (const c of cs) for (const t of c.toks) allToks.push(t);
		const setCtx = () => { for (const t of allToks) t.ctx = ctxOf(t.raw); };
		ACT = null;
		setCtx();
		let map = null, tables = null, segModeCost = null, choice;
		const symCost = (t, s) => (!t || !t.len[s] ? 20 : t.single ? 0 : t.len[s]);
		for (let it = 0; it < OPT.iters; it++) {
			choice = items.map((item) => item.hold ? item : item.segs.map((cs, si) => {
				let best = null, bc = Infinity;
				for (const c of cs) {
					let bits = 0;
					if (!tables) for (const t of c.toks) bits += 1 + t.ne + (t.sym < A.nj ? 2 + Math.log2(t.sym % A.nres + 1) : 2);
					else {
						bits += segModeCost[si][c.mi] ?? 20;
						for (const t of c.toks) { const lg = logical(si, c.mode, t.ctx); bits += symCost(map[lg] < 0 ? null : tables[map[lg]], t.sym) + t.ne; }
					}
					if (bits < bc) { bc = bits; best = c; }
				}
				return best;
			}));
			if (it === OPT.actIter) { ACT = actSearch(choice, q, A); setCtx(); }
			const freq = Array.from({ length: NLOG }, () => new Array(A.size).fill(0));
			const mfreq = SEGS.map((S) => new Array(S.modes.length).fill(0));
			for (const segs of choice) if (!segs.hold) segs.forEach((c, si) => {
				mfreq[si][c.mi]++;
				for (const t of c.toks) freq[logical(si, c.mode, t.ctx)][t.sym]++;
			});
			const cr = cluster(freq);
			map = cr.map;
			tables = cr.freqs.map((f) => makeTable(codeLengths(f, OPT.maxLen)));
			segModeCost = mfreq.map((f) => { const tot = f.reduce((a, b) => a + b, 0); return f.map((v) => (v ? Math.max(0.2, -Math.log2(v / tot)) : 20)); });
		}
		// The frame tables: [listed tuples][escape][hold bins]; table 1 (after a
		// hold) has no hold symbols. Tuples used fewer than tmin times are
		// escaped.
		const tupleKey = (segs) => segs.map((c) => c.mi).join(',');
		const tf = new Map();
		for (const segs of choice) if (!segs.hold) { const k = tupleKey(segs); tf.set(k, (tf.get(k) || 0) + 1); }
		const allTuples = [...tf.keys()].sort((a, b) => tf.get(b) - tf.get(a));
		const tuples = allTuples.filter((k, i) => i < OPT.tmax && tf.get(k) >= OPT.tmin);
		const nt = tuples.length, ESC = nt;
		const ffreq = [new Array(nt + 1 + HOLD_SYMS).fill(0), new Array(nt + 1).fill(0)];
		let fctx = 0;
		const fsym = choice.map((segs) => {
			const c = fctx;
			fctx = segs.hold ? 1 : 0;
			let s;
			if (segs.hold) s = nt + 1 + HOLD.bin(segs.hold - 1)[0];
			else { s = tuples.indexOf(tupleKey(segs)); if (s < 0) s = ESC; }
			ffreq[c][s]++;
			return [c, s];
		});
		const ftables = ffreq.map((f) => makeTable(codeLengths(f, OPT.maxLen)));

		const w = new BW();
		const mbits = SEGS.map((S) => nbitsFor(S.modes.length));
		putGamma(w, nt + 1);
		for (const k of tuples) k.split(',').forEach((mi, si) => w.put(+mi, mbits[si]));
		putLens(w, ftables[0].len);
		if (ffreq[0].some((v, i) => v && i > nt)) putLens(w, ftables[1].len);
		// the families used by any tuple (listed or escaped): a 12-bit mask
		let fmask = 0;
		for (const k of allTuples) k.split(',').forEach((mi, si) => { const mode = SEGS[si].modes[+mi]; if (mode !== 'Z') fmask |= 1 << (SEGS[si].cs * NFAM + (MODE_FAM[mode] ?? 0)); });
		w.put(fmask, 3 * NFAM);
		if (TT && !choice.some((segs) => !segs.hold && segs.some((c) => c.mode === 'X'))) TT = null;
		w.bit(TT ? 1 : 0);
		if (TT && q === 8) w.bit(TKIND);
		if (TT) putTT(w, q);
		w.bit(ACT ? 1 : 0);
		if (ACT) for (const t of ACT) w.put(t, q + 1);
		// the token tables: their number, the lengths of each, then the map
		// logical context -> table
		putGamma(w, tables.length + 1);
		for (const t of tables) putLens(w, t.len);
		const pmr = { pm: 0 };
		for (let sf = 0; sf < 3 * NFAM; sf++) if (fmask >> sf & 1) mapFamily(map, sf * NCTX, tables.length, pmr, w, null);
		// the frames
		choice.forEach((segs, ci) => {
			const [fc, fs] = fsym[ci];
			putSym(w, ftables[fc], fs);
			if (segs.hold) {
				const [, ne, ex] = HOLD.bin(segs.hold - 1);
				w.put(ex, ne);
				return;
			}
			if (fs === ESC) segs.forEach((c, si) => w.put(c.mi, mbits[si]));
			segs.forEach((c, si) => {
				for (const t of c.toks) {
					putSym(w, tables[map[logical(si, c.mode, t.ctx)]], t.sym);
					w.put(t.ex, t.ne);
				}
			});
		});
		const body = w.finish();
		const out = new Uint8Array(8 + body.length);
		out.set([0x4c, 0x41, 0x30, 0x34, frames.length & 255, frames.length >> 8, fps, q]);
		out.set(body, 8);
		return { out, tt: !!TT };
	}

	// pattern: {fps, frames: [[384 values 0..255, per slot], ...]}.
	// opts.quantBits: 8 (every value), 4, 2 or 1 bits per LED.
	function compressPattern(pattern, { quantBits = 8 } = {}) {
		const q = quantBits;
		if (![1, 2, 4, 8].includes(q)) throw new Error('quantBits must be 1, 2, 4 or 8');
		if (pattern.frames.length === 0) throw new Error('no frames');
		if (pattern.frames.some((f) => f.length !== N)) throw new Error(`every frame must have exactly ${N} values`);
		if (pattern.frames.length > 0xffff) throw new Error('too many frames (max 65535)');
		const fps = Math.max(1, Math.min(255, Math.round(pattern.fps || 4)));
		const slots = pattern.frames.map((f) => f.map((v) => quantize(Math.max(0, Math.min(255, Math.round(v))), q)));
		let best = null;
		for (const variant of q === 8 ? [keepDuty(slots), lowestDuty(slots)] : [slots]) {
			const frames = variant.map((f) => LAYOUT_ORDER.map((slot) => f[slot]));
			// with and without the transition table: the smaller
			const a = encodeWith(frames, fps, q, true);
			const b = a.tt ? encodeWith(frames, fps, q, false) : a;
			for (const c of [a, b]) if (!best || c.out.length < best.length) best = c.out;
		}
		return best;
	}

	// Returns {fps, quantBits, frames: [[384 values 0..255, per slot], ...]}
	function decompressPattern(bytes) {
		const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
		if (magic !== LEDANIM_MAGIC) throw new Error(`not an ${LEDANIM_MAGIC} .ledanim file (older formats are not supported)`);
		const nf = bytes[4] | (bytes[5] << 8), fps = bytes[6], q = bytes[7];
		if (![1, 2, 4, 8].includes(q)) throw new Error('bad quantBits');
		const A = alphabet(q), m = (1 << q) - 1;
		const r = new BR(bytes, 8);
		const nt = getGamma(r) - 1, mbits = SEGS.map((S) => nbitsFor(S.modes.length));
		const readTuple = () => SEGS.map((S, si) => S.modes[r.get(mbits[si])] ?? 'Z');
		const tuples = [];
		for (let i = 0; i < nt; i++) tuples.push(readTuple());
		const ftables = [decTable(getLens(r, nt + 1 + HOLD_SYMS))];
		ftables.push(ftables[0].sym.some((s) => s > nt) ? decTable(getLens(r, nt + 1)) : null);
		const fmask = r.get(3 * NFAM);
		ttSetQ(q);
		TT = null;
		TKIND = 0;
		if (r.bit()) { TKIND = q === 8 ? r.bit() : 0; TT = getTT(r, q); }
		ACT = r.bit() ? [r.get(q + 1), r.get(q + 1), r.get(q + 1)] : null;
		const ntab = getGamma(r) - 1, tables = [];
		for (let i = 0; i < ntab; i++) tables.push(decTable(getLens(r, A.size)));
		const map = new Array(NLOG).fill(-1), pmr = { pm: 0 };
		for (let sf = 0; sf < 3 * NFAM; sf++) if (fmask >> sf & 1) mapFamily(map, sf * NCTX, ntab, pmr, null, r);
		let fctx = 0;
		let cur = new Array(N).fill(0), prev = cur.slice(), hold = 0;
		const frames = [];
		for (let f = 0; f < nf; f++) {
			const prev2 = f < 2 ? new Array(N).fill(0) : prev;
			prev = f < 1 ? new Array(N).fill(0) : cur;
			cur = prev.slice();
			if (!hold) {
				const s = readSym(r, ftables[fctx]);
				fctx = s > nt ? 1 : 0;
				if (s > nt) { const [b, ne] = HOLD.base(s - nt - 1); hold = b + r.get(ne) + 1; }
				else {
					const tuple = s === nt ? readTuple() : tuples[s];
					for (let si = 0; si < SEGS.length; si++) {
						const mode = tuple[si];
						if (mode === 'Z') continue;
						const ord = scanOrder(si, mode), sp = SPATIAL.has(mode), n = ord.length;
						if (!sp) for (const p of ord) cur[p] = pred(mode, p, cur, prev, prev2, m);
						let ctx = 3;
						for (let i = 0; i < n;) {
							const sym = readSym(r, tables[map[logical(si, mode, ctxOf(rawCtx(ctx, ord[i], prev, prev2, cur)))]]);
							let run = 0;
							if (sym < A.nj) run = 0;
							else if (sym === A.eob) run = n - i;
							else { const [b, ne] = RUN.base(sym - A.nj); run = Math.min(n - i, b + r.get(ne) + 1); }
							for (; run > 0; run--, i++) if (sp) cur[ord[i]] = pred(mode, ord[i], cur, prev, prev2, m);
							if (sym < A.nj) {
								const [b, ne] = RES.base(sym);
								const z = b + r.get(ne) + 1, p = ord[i++];
								cur[p] = ((sp ? pred(mode, p, cur, prev, prev2, m) : cur[p]) + unzz(z)) & m;
								ctx = z <= OPT.ctxThr ? 1 : 2;
							} else ctx = 0;
						}
					}
				}
			}
			if (hold) hold--;
			const fr = new Array(N);
			for (let i = 0; i < N; i++) fr[LAYOUT_ORDER[i]] = dequantize(cur[i], q);
			frames.push(fr);
		}
		return { fps, quantBits: q, frames };
	}

	return { compressPattern, decompressPattern };
})();

if (typeof module !== 'undefined') module.exports = { LEDANIM_MAGIC, LEDANIM_PIXELS, quantize, dequantize, compressPattern, decompressPattern };
