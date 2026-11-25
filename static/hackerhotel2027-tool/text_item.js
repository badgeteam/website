// Text items for the badge's store (STORE_TYPE_TEXT, the firmware's
// nametag.h): the badge keeps the text itself and draws it in its own font,
// as the name tag. One byte per character, so the store holds about 31 000
// characters, where an animation of the same text holds a few hundred.
//
// The payload: "HHT1", speed (columns per second, 1 .. 60), style
// (0: as the name tag, 1: only the text), two zero bytes, then the text in
// printable ASCII.
//
// Plain script like the other webui files; in node, require() returns the
// same names.
'use strict';

const TEXT_ITEM = Object.freeze({
	MAGIC: 'HHT1',
	HEADER_BYTES: 8,
	MIN_SPEED: 1,
	MAX_SPEED: 60,
	DEFAULT_SPEED: 10, // as the name tag
	STYLE: Object.freeze({ NAMETAG: 0, PLAIN: 1 }),
});

// Characters the font has no glyph for, written with ones it has
const TEXT_ITEM_REPLACEMENTS = {
	'\u2018': "'", '\u2019': "'", '\u201a': "'", '\u201b': "'",
	'\u201c': '"', '\u201d': '"', '\u201e': '"', '\u00ab': '"', '\u00bb': '"',
	'\u2013': '-', '\u2014': '-', '\u2212': '-', '\u2026': '...',
	'\u00df': 'ss', '\u00e6': 'ae', '\u00c6': 'AE', '\u0153': 'oe', '\u0152': 'OE',
	'\u00f8': 'o', '\u00d8': 'O', '\u0142': 'l', '\u0141': 'L', '\u00d0': 'D', '\u00f0': 'd',
	'\u00fe': 'th', '\u00de': 'Th', '\u20ac': 'EUR', '\u00a0': ' ',
};

// The text as the badge can show it: accents dropped (e -> e), quotes and
// dashes made plain, a line break as two spaces, a tab as one, and anything else
// outside printable ASCII as '?'
function textItemAscii(text) {
	let out = '';
	for (const ch of String(text).normalize('NFKD')) {
		if (/\p{M}/u.test(ch)) continue; // an accent, split off by NFKD
		if (ch === '\n') out += '  '; // a line break: a wider gap
		else if (ch === '\r') continue;
		else if (ch === '\t') out += ' ';
		else if (ch >= ' ' && ch <= '~') out += ch;
		else out += TEXT_ITEM_REPLACEMENTS[ch] ?? '?';
	}
	return out.replace(/ {2,}/g, '  ').trim();
}

// The item's payload. Options: speed (columns per second), style
// (TEXT_ITEM.STYLE.*). Throws if there is no text.
function makeTextItem(text, { speed = TEXT_ITEM.DEFAULT_SPEED, style = TEXT_ITEM.STYLE.NAMETAG } = {}) {
	const ascii = textItemAscii(text);
	if (!ascii) throw new Error('There is no text to store.');
	speed = Math.round(Number(speed));
	if (!(speed >= TEXT_ITEM.MIN_SPEED && speed <= TEXT_ITEM.MAX_SPEED))
		throw new Error(`The speed must be ${TEXT_ITEM.MIN_SPEED} to ${TEXT_ITEM.MAX_SPEED} columns per second.`);
	if (!Object.values(TEXT_ITEM.STYLE).includes(style)) throw new Error(`Unknown text style ${style}.`);
	const bytes = new Uint8Array(TEXT_ITEM.HEADER_BYTES + ascii.length);
	bytes.set(new TextEncoder().encode(TEXT_ITEM.MAGIC), 0);
	bytes[4] = speed;
	bytes[5] = style;
	for (let i = 0; i < ascii.length; i++) bytes[TEXT_ITEM.HEADER_BYTES + i] = ascii.charCodeAt(i);
	return bytes;
}

// The item's name in the store (20 bytes at most): the start of the text
function textItemName(text) {
	const ascii = textItemAscii(text);
	return ascii.length <= 20 ? ascii : ascii.slice(0, 19).trimEnd() + '~';
}

if (typeof module === 'object' && module.exports) module.exports = { TEXT_ITEM, textItemAscii, makeTextItem, textItemName };
