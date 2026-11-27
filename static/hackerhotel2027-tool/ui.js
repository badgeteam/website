// Small accessible UI helpers for app.js: status announcements, inline
// errors, a confirm dialog and busy buttons. Loaded after text_item.js and
// before app.js. Every top-level name starts with "ui".
'use strict';

// A visually hidden live region for messages that have no status line of
// their own on the page. It exists from page load, so screen readers pick
// up the first change.
const uiLiveRegion = (() => {
	const p = document.createElement('p');
	p.className = 'visually-hidden';
	p.setAttribute('role', 'status');
	p.id = 'ui-live';
	document.body.appendChild(p);
	return p;
})();

// Per element: the throttle state of uiAnnounce and what uiError changed
const uiState = new WeakMap();

function uiStateOf(el) {
	let s = uiState.get(el);
	if (!s) {
		s = { lastAt: 0, lastPercent: null, timer: null, pending: null, error: null };
		uiState.set(el, s);
	}
	return s;
}

// Undoes uiError on `el`: its role goes back to what it was
function uiClearError(el) {
	const s = uiState.get(el);
	if (!s || !s.error) return;
	if (s.error.role === null) el.removeAttribute('role');
	else el.setAttribute('role', s.error.role);
	s.error = null;
}

function uiWrite(el, text) {
	const s = uiStateOf(el);
	s.lastAt = Date.now();
	if (el.textContent !== text) el.textContent = text;
}

// Shows `text` in `el` (a role=status element, or any element). With no
// element, the text goes to the hidden page-wide live region.
// opts.throttleMs: write at most this often; the newest text is written
// when the time is up. opts.percent: with throttleMs, a progress value
// (0-100); a 25% step is written at once.
// A call without throttleMs cancels a waiting throttled text and clears an
// error that uiError showed in `el`.
function uiAnnounce(el, text, opts = {}) {
	if (!el) el = uiLiveRegion;
	const s = uiStateOf(el);
	const throttleMs = opts.throttleMs || 0;
	if (!throttleMs) {
		clearTimeout(s.timer);
		s.timer = null;
		s.pending = null;
		s.lastPercent = null;
		uiClearError(el);
		if (el === uiLiveRegion && el.textContent === text) {
			// the same text again: empty the region first, so it is read again
			el.textContent = '';
			s.timer = setTimeout(() => {
				s.timer = null;
				uiWrite(el, text);
			}, 100);
			return;
		}
		uiWrite(el, text);
		return;
	}
	uiClearError(el);
	const now = Date.now();
	const step = typeof opts.percent === 'number' &&
		(s.lastPercent === null || Math.floor(opts.percent / 25) !== Math.floor(s.lastPercent / 25));
	if (step || now - s.lastAt >= throttleMs) {
		clearTimeout(s.timer);
		s.timer = null;
		s.pending = null;
		if (typeof opts.percent === 'number') s.lastPercent = opts.percent;
		uiWrite(el, text);
		return;
	}
	s.pending = { text, percent: opts.percent };
	if (!s.timer) {
		s.timer = setTimeout(() => {
			s.timer = null;
			if (!s.pending) return;
			if (typeof s.pending.percent === 'number') s.lastPercent = s.pending.percent;
			uiWrite(el, s.pending.text);
			s.pending = null;
		}, throttleMs - (now - s.lastAt));
	}
}

// Shows an error in `el` as an alert (styles.css colours [role=alert]).
// The next uiAnnounce on `el` turns it back into a plain status line.
function uiError(el, text) {
	if (!el) el = uiLiveRegion;
	const s = uiStateOf(el);
	clearTimeout(s.timer);
	s.timer = null;
	s.pending = null;
	if (!s.error) s.error = { role: el.getAttribute('role') };
	el.setAttribute('role', 'alert');
	el.textContent = ''; // a new alert, even with the same text
	uiWrite(el, text);
}

// True while `el` shows an error from uiError
function uiHasError(el) {
	const s = el && uiState.get(el);
	return !!(s && s.error);
}

// An error for a control that has no status line: shown in a line made
// for it after `anchor` (or after the button row it sits in). The line
// empties on the next click or change inside the anchor.
function uiErrorFor(anchor, text) {
	if (!anchor) return uiError(null, text);
	const id = `${anchor.id || 'ui'}-error`;
	let line = document.getElementById(id);
	if (!line) {
		line = document.createElement('p');
		line.id = id;
		line.className = 'meta';
		const after = anchor.closest('.button-row, .input-row') || anchor.closest('label') || anchor;
		after.insertAdjacentElement('afterend', line);
		const clear = () => {
			if (line.textContent) uiAnnounce(line, '');
		};
		// capture: runs before the control's own handler, which may show a new error
		anchor.addEventListener('click', clear, true);
		anchor.addEventListener('change', clear, true);
	}
	uiError(line, text);
}

// --- Confirm dialog ---------------------------------------------------

let uiDialog = null;
let uiDialogResolve = null;
let uiDialogOpener = null;

function uiDialogFinish(answer) {
	const resolve = uiDialogResolve;
	if (!resolve) return;
	uiDialogResolve = null;
	if (uiDialog.open) uiDialog.close();
	const opener = uiDialogOpener;
	uiDialogOpener = null;
	if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
	resolve(answer);
}

function uiBuildDialog() {
	const dialog = document.createElement('dialog');
	dialog.className = 'card ui-dialog';
	dialog.setAttribute('aria-labelledby', 'ui-dialog-title');
	dialog.setAttribute('aria-describedby', 'ui-dialog-message');
	const title = document.createElement('h2');
	title.id = 'ui-dialog-title';
	const message = document.createElement('p');
	message.id = 'ui-dialog-message';
	const row = document.createElement('div');
	row.className = 'button-row';
	const cancel = document.createElement('button');
	cancel.type = 'button';
	cancel.className = 'btn';
	cancel.id = 'ui-dialog-cancel';
	const ok = document.createElement('button');
	ok.type = 'button';
	ok.id = 'ui-dialog-ok';
	row.append(cancel, ok);
	dialog.append(title, message, row);
	cancel.addEventListener('click', () => uiDialogFinish(false));
	ok.addEventListener('click', () => uiDialogFinish(true));
	dialog.addEventListener('cancel', (ev) => {
		ev.preventDefault(); // Escape
		uiDialogFinish(false);
	});
	// Closed some other way (the browser may close it on a second Escape)
	dialog.addEventListener('close', () => {
		if (!dialog.open) uiDialogFinish(false);
	});
	document.body.appendChild(dialog);
	return dialog;
}

// Asks a yes/no question in a modal dialog. Resolves true for the confirm
// button, false for Cancel or Escape. Focus starts on Cancel and goes back
// to the element that had it.
// opts: confirmLabel, cancelLabel, title (defaults to confirmLabel),
// danger (a red confirm button).
function uiConfirm(message, opts = {}) {
	if (!uiDialog) uiDialog = uiBuildDialog();
	const dialog = uiDialog;
	uiDialogFinish(false); // an older question still open gets no
	const confirmLabel = opts.confirmLabel || 'OK';
	dialog.querySelector('#ui-dialog-title').textContent = opts.title || confirmLabel;
	dialog.querySelector('#ui-dialog-message').textContent = message;
	const cancel = dialog.querySelector('#ui-dialog-cancel');
	cancel.textContent = opts.cancelLabel || 'Cancel';
	const ok = dialog.querySelector('#ui-dialog-ok');
	ok.textContent = confirmLabel;
	ok.className = opts.danger ? 'btn btn-danger' : 'btn btn-primary';
	uiDialogOpener = document.activeElement;
	return new Promise((resolve) => {
		uiDialogResolve = resolve;
		dialog.showModal();
		cancel.focus();
	});
}

// --- Busy buttons ---------------------------------------------------

// uiBusy(button, text) shows `text` on the button and marks it
// aria-disabled (it keeps focus; click handlers check uiIsBusy).
// uiBusy(button, null) puts the old content back.
function uiBusy(button, text) {
	if (!button) return;
	if (text === null || text === undefined) {
		if (!button.uiSaved) return;
		button.replaceChildren(...button.uiSaved);
		button.uiSaved = null;
		button.removeAttribute('aria-disabled');
		return;
	}
	if (!button.uiSaved) {
		button.uiSaved = [...button.childNodes];
		button.setAttribute('aria-disabled', 'true');
	}
	if (button.textContent !== text) button.textContent = text;
}

function uiIsBusy(button) {
	return !!(button && button.uiSaved);
}
