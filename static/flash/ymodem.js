// SPDX-FileCopyrightText: Stichting Badge.Team
// SPDX-License-Identifier: MIT
//
// WAD uploader for the DOOM firmware.
//
// DOOM's game data is far too big for the badge's little FAT12 volume, so it
// lives in the 2 MB QSPI flash instead and is pushed there over the badge's
// USB serial console with YMODEM (1K blocks, CRC-16). That means Web Serial
// here, not the WebUSB DFU used to write firmware.
//
// The badge enters upload mode when you reset it holding Cancel — and by
// itself when no WAD has been uploaded yet. In that mode it prints a stream
// of 'C' characters, which is YMODEM's "send me the header" prompt.

const $ = (id) => document.getElementById(id);

const configEl = $("flasher-config");
const root = $("wadloader");
if (!configEl || !root) throw new Error("ymodem: markup not present");

const badges = JSON.parse(configEl.textContent || "[]");
const badge = badges[0];
const wads = badge?.wads || [];

// The QSPI region minus the length word the firmware stores in front.
const QSPI_MAX = 2 * 1024 * 1024 - 4;

const el = {
  unsupported: $("wad-unsupported"),
  wadSelect: $("wad-select"),
  fileInput: $("wad-file"),
  info: $("wad-info"),
  btnConnect: $("btn-wad-connect"),
  btnSend: $("btn-wad-send"),
  status: $("wad-status"),
  progress: $("wad-progress"),
  progLabel: $("wad-progress-label"),
  log: $("wad-log"),
};

function logLine(msg, cls) {
  const line = document.createElement("span");
  if (cls) line.className = cls;
  const ts = new Date().toISOString().split("T")[1].replace("Z", "");
  line.textContent = `[${ts}] ${msg}\n`;
  el.log.appendChild(line);
  el.log.scrollTop = el.log.scrollHeight;
}
const logOk = (m) => logLine(m, "ok");
const logErr = (m) => logLine(m, "err");

// --------------------------------------------------------------------------
// Choosing a blob. `blob` is anything with {name, size, arrayBuffer()}, so a
// prepared download and a user's own file look the same to the sender.
// --------------------------------------------------------------------------

let blob = null;

function describeBlob() {
  if (!blob) {
    el.info.textContent = "No WAD chosen yet.";
  } else {
    const kib = (blob.size / 1024).toFixed(0);
    el.info.textContent =
      blob.size > QSPI_MAX
        ? `${blob.name} — ${kib} KiB. Too big: the badge has room for ${(QSPI_MAX / 1024).toFixed(0)} KiB.`
        : `${blob.name} — ${kib} KiB`;
  }
  updateButtons();
}

function selectPreparedWad(idx) {
  const wad = wads[idx];
  if (!wad) {
    blob = null;
    return describeBlob();
  }
  el.fileInput.value = "";
  blob = {
    name: wad.file.split("/").pop(),
    size: wad.size || 0,
    sha256: wad.sha256,
    arrayBuffer: async () => {
      const resp = await fetch(wad.file);
      if (!resp.ok) throw new Error(`fetch ${wad.file}: HTTP ${resp.status}`);
      return resp.arrayBuffer();
    },
  };
  el.info.textContent = wad.notes || wad.label;
  updateButtons();
}

// --------------------------------------------------------------------------
// Web Serial plumbing
// --------------------------------------------------------------------------

let port = null;
let writer = null;
let connected = false;
let sending = false;

// Incoming bytes queue up here for the sender to pull from.
let rxQueue = [];
let rxWaiter = null;

function updateButtons() {
  el.btnConnect.textContent = connected ? "Disconnect" : "Connect to the badge";
  el.status.textContent = connected ? "connected" : "disconnected";
  el.status.classList.toggle("connected", connected);
  el.btnSend.disabled =
    !connected || sending || !blob || blob.size > QSPI_MAX;
}

async function readLoop() {
  while (port && port.readable) {
    const reader = port.readable.getReader();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const b of value) rxQueue.push(b);
        if (rxWaiter) {
          const w = rxWaiter;
          rxWaiter = null;
          w();
        }
      }
    } catch {
      break;
    } finally {
      reader.releaseLock();
    }
  }
  disconnect(true);
}

function readByte(timeoutMs) {
  return new Promise((resolve) => {
    const started = Date.now();
    const poll = () => {
      if (rxQueue.length) return resolve(rxQueue.shift());
      if (Date.now() - started > timeoutMs) return resolve(-1);
      rxWaiter = poll;
      setTimeout(() => {
        if (rxWaiter === poll) {
          rxWaiter = null;
          poll();
        }
      }, 50);
    };
    poll();
  });
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
    logErr(`could not open the port: ${e.message || e}`);
    return;
  }
  port = p;
  writer = port.writable.getWriter();
  connected = true;
  rxQueue = [];
  logOk("connected — the badge should be waiting for a YMODEM transfer");
  updateButtons();
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
  if (connected) {
    connected = false;
    logLine(fromError ? "connection lost" : "disconnected", fromError ? "err" : null);
    updateButtons();
  }
  try {
    await p.close();
  } catch {
    /* already gone */
  }
}

// --------------------------------------------------------------------------
// YMODEM sender
// --------------------------------------------------------------------------

const SOH = 0x01;
const STX = 0x02;
const EOT = 0x04;
const ACK = 0x06;
const NAK = 0x15;
const CAN = 0x18;
const CHAR_C = 0x43;

function crc16(buf) {
  let crc = 0;
  for (const b of buf) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

async function waitByte(accept, timeoutMs, what) {
  const started = Date.now();
  for (;;) {
    const left = timeoutMs - (Date.now() - started);
    if (left <= 0) throw new Error(`timed out waiting for ${what}`);
    const b = await readByte(left);
    if (b === -1) throw new Error(`timed out waiting for ${what}`);
    if (accept.includes(b)) return b;
    if (b === CAN) throw new Error("the badge cancelled the transfer");
    // Anything else — a stale 'C', console chatter — is ignored.
  }
}

async function sendBlock(seq, data, use1k) {
  const n = use1k ? 1024 : 128;
  const buf = new Uint8Array(3 + n + 2);
  buf[0] = use1k ? STX : SOH;
  buf[1] = seq & 0xff;
  buf[2] = ~seq & 0xff;
  buf.set(data.subarray(0, Math.min(data.length, n)), 3);
  const crc = crc16(buf.subarray(3, 3 + n));
  buf[3 + n] = crc >> 8;
  buf[3 + n + 1] = crc & 0xff;

  for (let retry = 0; retry < 10; retry++) {
    await writer.write(buf);
    if ((await waitByte([ACK, NAK], 15000, "an acknowledgement")) === ACK) return;
    logLine(`block ${seq & 0xff} was rejected, retrying`, "warn");
  }
  throw new Error(`block ${seq & 0xff} failed after 10 attempts`);
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendWad() {
  sending = true;
  updateButtons();
  try {
    const data = new Uint8Array(await blob.arrayBuffer());

    if (blob.sha256) {
      const got = await sha256Hex(data);
      if (got !== blob.sha256.toLowerCase()) {
        throw new Error(`checksum mismatch — refusing to upload (got ${got})`);
      }
      logOk("SHA-256 verified");
    }

    // Drop any 'C's that arrived before we were ready to answer them.
    rxQueue = [];
    el.progLabel.textContent = "waiting for the badge…";
    await waitByte(
      [CHAR_C],
      30000,
      "the badge to ask for data (is it in WAD upload mode?)",
    );
    logOk("badge is ready, sending the header");

    // Block 0 carries "filename\0size " — the receiver reads digits up to
    // the space.
    const header = new Uint8Array(128);
    const meta = new TextEncoder().encode(
      `${blob.name.replaceAll(" ", "_")}\0${data.length} `,
    );
    header.set(meta.subarray(0, 127));
    await sendBlock(0, header, false);
    await waitByte([CHAR_C], 15000, "the go-ahead after the header");

    const total = Math.ceil(data.length / 1024);
    el.progress.max = total;
    for (let i = 0; i < total; i++) {
      const chunk = new Uint8Array(1024);
      chunk.set(data.subarray(i * 1024, (i + 1) * 1024));
      await sendBlock(i + 1, chunk, true);
      el.progress.value = i + 1;
      el.progLabel.textContent = `${i + 1} of ${total} blocks`;
    }

    logOk("data sent, closing the transfer");
    await writer.write(new Uint8Array([EOT]));
    await waitByte([ACK], 15000, "the end-of-transfer acknowledgement");
    await waitByte([CHAR_C], 15000, "the go-ahead to close the batch");
    await sendBlock(0, new Uint8Array(128), false); // empty header ends the batch

    el.progLabel.textContent = `done — ${data.length} bytes uploaded`;
    logOk("upload complete — a blue LED means it stored cleanly, and DOOM starts");
  } catch (e) {
    el.progLabel.textContent = "failed";
    logErr(e.message || String(e));
    // Tell the receiver to give up rather than leaving it waiting.
    try {
      await writer.write(new Uint8Array([CAN, CAN, CAN]));
    } catch {
      /* port already gone */
    }
  } finally {
    sending = false;
    updateButtons();
  }
}

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
  el.btnSend.addEventListener("click", sendWad);
  navigator.serial.addEventListener?.("disconnect", () => disconnect(true));
}

el.fileInput.addEventListener("change", () => {
  blob = el.fileInput.files[0] || null;
  if (el.wadSelect) el.wadSelect.value = "";
  describeBlob();
});

if (el.wadSelect) {
  el.wadSelect.addEventListener("change", (e) => {
    const v = e.target.value;
    if (v === "") {
      blob = null;
      describeBlob();
    } else {
      selectPreparedWad(Number(v));
    }
  });
  // Preselect the first prepared blob so the common path is two clicks.
  if (wads.length) {
    el.wadSelect.value = "0";
    selectPreparedWad(0);
  }
}

updateButtons();
