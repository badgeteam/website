// SPDX-FileCopyrightText: Stichting Badge.Team
// SPDX-License-Identifier: MIT
//
// Serial terminal for CircuitPython on the badge.
//
// CircuitPython prints tracebacks and print() output to a USB serial console,
// and offers a REPL there. Without this you need a terminal program (screen,
// picocom, PuTTY) just to see why your code did not run — so the same Web
// Serial support that uploads DOOM's WAD gets you a console in the page.
//
// The terminal is deliberately minimal: a line buffer with enough escape
// handling for the REPL's own output (carriage returns, backspace, and the
// erase-to-end-of-line it uses to redraw the prompt). It is not a VT100, and
// full-screen curses-style programs will not render correctly.

const $ = (id) => document.getElementById(id);

const term = $("repl-term");
if (!term) throw new Error("repl: markup not present");

const el = {
  status: $("repl-status"),
  unsupported: $("repl-unsupported"),
  btnConnect: $("btn-repl-connect"),
  btnCtrlC: $("btn-repl-ctrlc"),
  btnCtrlD: $("btn-repl-ctrld"),
  btnPaste: $("btn-repl-paste"),
  btnClear: $("btn-repl-clear"),
  btnFullscreen: $("btn-repl-fullscreen"),
  shell: $("repl-shell"),
};

// --------------------------------------------------------------------------
// Terminal
// --------------------------------------------------------------------------

const MAX_LINES = 1000;
let lines = [];
let cur = "";
let curPos = 0;
let esc = null;

function render() {
  term.textContent = lines.join("\n") + (lines.length ? "\n" : "") + cur;
  term.scrollTop = term.scrollHeight;
}

function feed(text) {
  for (const ch of text) {
    if (esc !== null) {
      esc += ch;
      // A CSI sequence ends at a letter. The only one worth honouring here is
      // K (erase to end of line), which the REPL uses to redraw the prompt.
      if (/[A-Za-z]/.test(ch)) {
        if (esc.endsWith("K")) cur = cur.slice(0, curPos);
        esc = null;
      }
      continue;
    }
    if (ch === "\x1b") {
      esc = "";
    } else if (ch === "\n") {
      lines.push(cur);
      if (lines.length > MAX_LINES) lines.shift();
      cur = "";
      curPos = 0;
    } else if (ch === "\r") {
      curPos = 0;
    } else if (ch === "\b") {
      curPos = Math.max(0, curPos - 1);
    } else if (ch === "\x07") {
      // bell — ignore
    } else {
      cur = cur.slice(0, curPos) + ch + cur.slice(curPos + 1);
      curPos++;
    }
  }
  render();
  noteOutput(text);
}

const sysMsg = (msg) => feed(`\r\n[${msg}]\r\n`);

// Lets the paste path wait for something the badge prints back. Matching is
// done on a rolling tail rather than the whole buffer, so a phrase left over
// from an earlier paste cannot satisfy a later wait.
let watcher = null;
let recentOutput = "";

function noteOutput(text) {
  if (!watcher) return;
  recentOutput = (recentOutput + text).slice(-256);
  if (recentOutput.includes(watcher.needle)) {
    const w = watcher;
    watcher = null;
    w.resolve(true);
  }
}

function waitForText(needle, timeoutMs) {
  recentOutput = "";
  return new Promise((resolve) => {
    watcher = { needle, resolve };
    setTimeout(() => {
      if (watcher?.resolve === resolve) {
        watcher = null;
        resolve(false);
      }
    }, timeoutMs);
  });
}

// --------------------------------------------------------------------------
// Web Serial
// --------------------------------------------------------------------------

let port = null;
let writer = null;
let connected = false;
const encoder = new TextEncoder();

function setConnected(on) {
  connected = on;
  el.status.textContent = on ? "connected" : "disconnected";
  el.status.classList.toggle("connected", on);
  el.btnConnect.textContent = on ? "Disconnect" : "Connect to the badge";
  el.btnCtrlC.disabled = !on;
  el.btnCtrlD.disabled = !on;
  el.btnPaste.disabled = !on;
}

// The REPL takes carriage return as Enter and ignores a bare line feed, so
// clipboard text pasted verbatim arrives as one run-on line. Translate every
// flavour of line ending to CR.
const toCr = (text) => text.replace(/\r\n|\r|\n/g, "\r");

/**
 * Paste text as a human would, but without the damage.
 *
 * Sending multi-line code straight at the prompt gets it mangled: the REPL
 * echoes its own indentation after `if x:` and friends, which compounds with
 * the indentation already in the text. CircuitPython has paste mode for
 * exactly this — Ctrl-E in, Ctrl-D to run — where it takes the text literally.
 *
 * Ctrl-D only means "execute" *inside* paste mode; at a normal prompt it is a
 * soft reboot. So we confirm the badge really entered paste mode before
 * sending it, and fall back to a plain paste if it did not.
 */
async function sendPaste(text) {
  const body = toCr(text);
  if (!body.includes("\r")) {
    await send(body); // single line — nothing to protect it from
    return;
  }

  await send("\x05"); // Ctrl-E
  if (await waitForText("paste mode", 750)) {
    await send(body);
    await send("\x04"); // Ctrl-D — runs it, because we are in paste mode
    return;
  }

  // No paste mode: maybe a program is running, or this is not a REPL at all.
  // Send the text as-is and leave the trailing Ctrl-D well alone.
  sysMsg("could not enter paste mode — pasting line by line instead");
  await send(body);
}

// Ctrl-V already works once the terminal has focus, via the paste event. The
// button covers the case where it does not — you have just copied an example
// from the page, and focus is still wherever you selected it.
async function pasteFromClipboard() {
  if (!navigator.clipboard?.readText) {
    sysMsg("this browser will not hand over the clipboard — click the console and press Ctrl-V");
    return;
  }
  let text;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    // Denied, or no permission prompt was possible.
    sysMsg("clipboard access was refused — click the console and press Ctrl-V");
    return;
  }
  if (!text) {
    sysMsg("the clipboard is empty");
    return;
  }
  await sendPaste(text);
  term.focus();
}

async function send(str) {
  if (!writer) return;
  try {
    await writer.write(encoder.encode(str));
  } catch {
    /* the port went away; readLoop will notice and disconnect */
  }
}

async function readLoop() {
  const decoder = new TextDecoder();
  while (port && port.readable) {
    const reader = port.readable.getReader();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        feed(decoder.decode(value, { stream: true }));
      }
    } catch {
      break; // unplugged mid-read
    } finally {
      reader.releaseLock();
    }
  }
  disconnect(true);
}

async function connect() {
  let p;
  try {
    p = await navigator.serial.requestPort();
  } catch {
    return; // cancelled
  }
  try {
    await p.open({ baudRate: 115200 });
  } catch (e) {
    sysMsg(`could not open the port: ${e.message || e}`);
    return;
  }
  port = p;
  writer = port.writable.getWriter();
  setConnected(true);
  sysMsg("connected — press Ctrl-C for the REPL prompt");
  term.focus();
  readLoop();
}

async function disconnect(fromError) {
  if (!port) return;
  const p = port;
  port = null;
  try {
    writer?.releaseLock();
  } catch {
    /* already released */
  }
  writer = null;
  try {
    await p.close();
  } catch {
    /* already gone */
  }
  if (connected) {
    setConnected(false);
    sysMsg(fromError ? "connection lost" : "disconnected");
  }
}

// --------------------------------------------------------------------------
// Keyboard
// --------------------------------------------------------------------------

const KEYS = {
  Enter: "\r",
  Backspace: "\x7f",
  Tab: "\t",
  Escape: "\x1b",
  ArrowUp: "\x1b[A",
  ArrowDown: "\x1b[B",
  ArrowRight: "\x1b[C",
  ArrowLeft: "\x1b[D",
  Home: "\x1b[H",
  End: "\x1b[F",
  Delete: "\x1b[3~",
};

term.addEventListener("keydown", (e) => {
  if (!connected) return;

  if (e.ctrlKey && !e.altKey && e.key.length === 1) {
    const c = e.key.toLowerCase().charCodeAt(0);
    if (c >= 97 && c <= 122) {
      // Leave Ctrl-C alone when there is a selection, so copying still works.
      if (e.key.toLowerCase() === "c" && window.getSelection()?.toString()) {
        return;
      }
      e.preventDefault();
      send(String.fromCharCode(c - 96));
      return;
    }
  }

  if (KEYS[e.key]) {
    e.preventDefault();
    send(KEYS[e.key]);
    return;
  }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    send(e.key);
  }
});

term.addEventListener("paste", (e) => {
  if (!connected) return;
  e.preventDefault();
  sendPaste(e.clipboardData.getData("text"));
});

// --------------------------------------------------------------------------
// Wiring
// --------------------------------------------------------------------------

if (!("serial" in navigator)) {
  el.unsupported.classList.remove("d-none");
  el.btnConnect.disabled = true;
} else {
  el.btnConnect.addEventListener("click", () =>
    connected ? disconnect(false) : connect(),
  );
  el.btnCtrlC.addEventListener("click", () => {
    send("\x03");
    term.focus();
  });
  el.btnCtrlD.addEventListener("click", () => {
    send("\x04");
    term.focus();
  });
  el.btnPaste.addEventListener("click", pasteFromClipboard);
  navigator.serial.addEventListener?.("disconnect", () => disconnect(true));
}

el.btnClear.addEventListener("click", () => {
  lines = [];
  cur = "";
  curPos = 0;
  render();
});

// --------------------------------------------------------------------------
// Fullscreen
// --------------------------------------------------------------------------

// Not every browser that ships Web Serial also allows the Fullscreen API in
// every context (an iframe without allowfullscreen, for one). Hide the button
// rather than offer one that throws.
if (!el.shell.requestFullscreen) {
  el.btnFullscreen.classList.add("d-none");
} else {
  el.btnFullscreen.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement === el.shell) {
        await document.exitFullscreen();
      } else {
        await el.shell.requestFullscreen();
      }
    } catch {
      // A rejected request (denied, or not user-activated) is not worth an
      // error in the log; the button simply did nothing.
    }
  });

  // Keep the button label and pressed state in step with reality, including
  // when the user leaves fullscreen with Esc rather than the button.
  document.addEventListener("fullscreenchange", () => {
    const on = document.fullscreenElement === el.shell;
    el.btnFullscreen.textContent = on ? "Exit fullscreen" : "Fullscreen";
    el.btnFullscreen.setAttribute("aria-pressed", String(on));
    if (on) term.focus();
  });
}

setConnected(false);
