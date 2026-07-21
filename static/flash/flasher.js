// SPDX-FileCopyrightText: Stichting Badge.Team
// SPDX-License-Identifier: MIT
//
// In-browser WebUSB firmware flasher for Badge.Team badges.
//
// Implements the standard USB DFU 1.1 class protocol (interface class 0xFE,
// subclass 0x01, protocol 0x02). All DFU traffic is class-targeted control
// transfers — no bulk endpoints, no CDC framing.
//
//   DFU_DNLOAD    (req 0x01, OUT) bmRequestType=0x21
//   DFU_GETSTATUS (req 0x03, IN)  bmRequestType=0xA1
//   DFU_CLRSTATUS (req 0x04, OUT) bmRequestType=0x21
//   DFU_ABORT     (req 0x06, OUT) bmRequestType=0x21
//
// `wIndex` is always the DFU interface number; `wValue` is the zero-based
// block number for DFU_DNLOAD and 0 otherwise.
//
// Ported from the standalone Cyber Ægg flasher, which serves the same UI
// from a local Rust server. Here the firmware registry is inlined into the
// page from data/firmwares.toml, so there is no backend to talk to.

// --------------------------------------------------------------------------
// DFU 1.1 constants (DFU spec v1.1 §A.1 / §A.2)
// --------------------------------------------------------------------------

const DFU_IFACE_CLASS = 0xfe; // Application Specific
const DFU_IFACE_SUBCLASS = 0x01; // DFU
const DFU_IFACE_PROTOCOL = 0x02; // DFU mode (not Runtime)

const DFU_DNLOAD = 0x01;
const DFU_GETSTATUS = 0x03;
const DFU_CLRSTATUS = 0x04;

const STATE = {
  appIDLE: 0,
  appDETACH: 1,
  dfuIDLE: 2,
  dfuDNLOAD_SYNC: 3,
  dfuDNBUSY: 4,
  dfuDNLOAD_IDLE: 5,
  dfuMANIFEST_SYNC: 6,
  dfuMANIFEST: 7,
  dfuMANIFEST_WAIT_RESET: 8,
  dfuUPLOAD_IDLE: 9,
  dfuERROR: 10,
};

const STATE_NAME = Object.fromEntries(
  Object.entries(STATE).map(([k, v]) => [v, k]),
);

const DFU_STATUS_NAME = {
  0x00: "OK",
  0x01: "errTARGET",
  0x02: "errFILE",
  0x03: "errWRITE",
  0x04: "errERASE",
  0x05: "errCHECK_ERASED",
  0x06: "errPROG",
  0x07: "errVERIFY",
  0x08: "errADDRESS",
  0x09: "errNOTDONE",
  0x0a: "errFIRMWARE",
  0x0b: "errVENDOR",
  0x0c: "errUSBR",
  0x0d: "errPOR",
  0x0e: "errUNKNOWN",
  0x0f: "errSTALLEDPKT",
};

const DEFAULT_BLOCK_SIZE = 4096;

// --------------------------------------------------------------------------
// DOM
// --------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);

const root = $("flasher");
const configEl = $("flasher-config");
if (!root || !configEl) {
  // Shortcode not on this page, or no firmware registered.
  throw new Error("flasher: markup not present");
}

const el = {
  unsupported: $("flasher-unsupported"),
  badgeSelect: $("badge-select"),
  badgeDocs: $("badge-docs"),
  dfuHint: $("dfu-hint"),
  btnConnect: $("btn-connect"),
  btnFlash: $("btn-flash"),
  btnClearLog: $("btn-clear-log"),
  devStatus: $("device-status"),
  devInfo: $("device-info"),
  infoProduct: $("info-product"),
  infoSerial: $("info-serial"),
  infoVidpid: $("info-vidpid"),
  infoMode: $("info-mode"),
  modeWarning: $("mode-warning"),
  fwSelect: $("firmware-select"),
  fwNotes: $("firmware-notes"),
  progress: $("progress"),
  progLabel: $("progress-label"),
  log: $("log"),
};

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------

/** @type {Array<object>} */
const badges = JSON.parse(configEl.textContent || "[]");

if (badges.length === 0) {
  // The shortcode renders an explanatory notice instead of the controls,
  // so there is nothing here to wire up.
  throw new Error("flasher: no badges registered");
}

let badge = badges[0] || null;
let device = null;
let dfuIfaceNum = null;
let deviceMode = "unknown";

const hex4 = (n) => n.toString(16).padStart(4, "0");
const usbId = (s) => (typeof s === "string" ? parseInt(s, 16) : s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --------------------------------------------------------------------------
// Logging
// --------------------------------------------------------------------------

function logLine(msg, cls) {
  const line = document.createElement("span");
  if (cls) line.className = cls;
  const ts = new Date().toISOString().split("T")[1].replace("Z", "");
  line.textContent = `[${ts}] ${msg}\n`;
  el.log.appendChild(line);
  el.log.scrollTop = el.log.scrollHeight;
}

const logOk = (m) => logLine(m, "ok");
const logWarn = (m) => logLine(m, "warn");
const logErr = (m) => logLine(m, "err");

const statusName = (s) => DFU_STATUS_NAME[s] || `unknown(0x${s.toString(16)})`;
const stateName = (s) => STATE_NAME[s] || `unknown(${s})`;

// --------------------------------------------------------------------------
// DFU class requests. `sess = { device, dfuIfaceNum }`.
// --------------------------------------------------------------------------

async function dfuDownload(sess, blockNum, data) {
  const payload = data && data.length ? data : new Uint8Array(0);
  const res = await sess.device.controlTransferOut(
    {
      requestType: "class",
      recipient: "interface",
      request: DFU_DNLOAD,
      value: blockNum & 0xffff,
      index: sess.dfuIfaceNum & 0xffff,
    },
    payload,
  );
  if (res.status !== "ok") {
    throw new Error(`DFU_DNLOAD block ${blockNum} status=${res.status}`);
  }
  if (res.bytesWritten !== payload.length) {
    throw new Error(
      `DFU_DNLOAD short write: ${res.bytesWritten}/${payload.length}`,
    );
  }
}

async function dfuGetStatus(sess) {
  const res = await sess.device.controlTransferIn(
    {
      requestType: "class",
      recipient: "interface",
      request: DFU_GETSTATUS,
      value: 0,
      index: sess.dfuIfaceNum & 0xffff,
    },
    6,
  );
  if (res.status !== "ok") throw new Error(`DFU_GETSTATUS status=${res.status}`);
  const view = new DataView(
    res.data.buffer,
    res.data.byteOffset,
    res.data.byteLength,
  );
  if (view.byteLength < 6) {
    throw new Error(`DFU_GETSTATUS short reply: ${view.byteLength}B`);
  }
  return {
    bStatus: view.getUint8(0),
    bwPollTimeout:
      view.getUint8(1) | (view.getUint8(2) << 8) | (view.getUint8(3) << 16),
    bState: view.getUint8(4),
  };
}

async function dfuClrStatus(sess) {
  const res = await sess.device.controlTransferOut({
    requestType: "class",
    recipient: "interface",
    request: DFU_CLRSTATUS,
    value: 0,
    index: sess.dfuIfaceNum & 0xffff,
  });
  if (res.status !== "ok") throw new Error(`DFU_CLRSTATUS status=${res.status}`);
}

async function ensureIdle(sess) {
  let st = await dfuGetStatus(sess);
  logOk(
    `pre-flight: status=${statusName(st.bStatus)} state=${stateName(st.bState)}`,
  );
  if (st.bState === STATE.dfuERROR) {
    logWarn("device in dfuERROR — sending DFU_CLRSTATUS");
    await dfuClrStatus(sess);
    st = await dfuGetStatus(sess);
  }
  if (st.bState !== STATE.dfuIDLE) {
    throw new Error(`device not in dfuIDLE (state=${stateName(st.bState)})`);
  }
}

async function pollUntilNotBusy(sess) {
  for (let i = 0; i < 100; i++) {
    const st = await dfuGetStatus(sess);
    if (st.bStatus !== 0x00) return st;
    if (st.bState === STATE.dfuDNLOAD_IDLE) return st;
    if (st.bState === STATE.dfuDNLOAD_SYNC || st.bState === STATE.dfuDNBUSY) {
      if (st.bwPollTimeout > 0) await sleep(st.bwPollTimeout);
      continue;
    }
    return st;
  }
  throw new Error("gave up waiting for the device after 100 polls");
}

async function pollManifestation(sess) {
  const deadline = performance.now() + 15000;
  while (performance.now() < deadline) {
    let st;
    try {
      st = await dfuGetStatus(sess);
    } catch {
      // Device re-enumerated — manifestation detached it. That is success.
      logOk("device detached during manifestation — flash succeeded");
      return;
    }
    if (st.bStatus !== 0x00) {
      throw new Error(`manifestation failed: ${statusName(st.bStatus)}`);
    }
    if (st.bState === STATE.dfuIDLE) {
      logOk("manifestation complete — device returned to dfuIDLE");
      return;
    }
    // The bootloader does not self-reset after manifestation: it keeps the
    // USB mass-storage volume up for file copying and boots the new app on
    // the next power-cycle. Parking in dfuMANIFEST_WAIT_RESET means the
    // image is fully written, so accept it rather than waiting for a reset.
    if (st.bState === STATE.dfuMANIFEST_WAIT_RESET) {
      logOk("flash complete — power-cycle the badge to boot it");
      return;
    }
    await sleep(st.bwPollTimeout > 0 ? st.bwPollTimeout : 50);
  }
  throw new Error("manifestation timed out");
}

async function flashImage(sess, bytes, blockSize, onProgress) {
  onProgress(0, "preparing");
  await ensureIdle(sess);

  const total = bytes.length;
  const blockCount = Math.ceil(total / blockSize);
  logOk(`writing ${total} B in ${blockCount} blocks of ${blockSize} B`);

  for (let blockNum = 0; blockNum < blockCount; blockNum++) {
    const offset = blockNum * blockSize;
    // subarray is a view, not a copy.
    const slice = bytes.subarray(offset, Math.min(offset + blockSize, total));

    onProgress((offset / total) * 100, `writing ${blockNum + 1}/${blockCount}`);
    await dfuDownload(sess, blockNum, slice);

    const st = await pollUntilNotBusy(sess);
    if (st.bStatus !== 0x00) {
      throw new Error(
        `block ${blockNum}: ${statusName(st.bStatus)} / ${stateName(st.bState)}`,
      );
    }
    if (st.bState !== STATE.dfuDNLOAD_IDLE) {
      throw new Error(
        `block ${blockNum}: expected dfuDNLOAD_IDLE, got ${stateName(st.bState)}`,
      );
    }
  }

  onProgress(100, "manifesting");
  // A zero-length DNLOAD block terminates the transfer.
  await dfuDownload(sess, blockCount, null);
  await pollManifestation(sess);
  onProgress(100, "done");
}

// --------------------------------------------------------------------------
// Device discovery
// --------------------------------------------------------------------------

function findDfuInterface(dev) {
  if (!dev.configuration) return null;
  for (const iface of dev.configuration.interfaces) {
    for (const alt of iface.alternates) {
      if (
        alt.interfaceClass === DFU_IFACE_CLASS &&
        alt.interfaceSubclass === DFU_IFACE_SUBCLASS &&
        alt.interfaceProtocol === DFU_IFACE_PROTOCOL
      ) {
        return iface;
      }
    }
  }
  return null;
}

function looksLikeCdc(dev) {
  if (!dev.configuration) return false;
  for (const iface of dev.configuration.interfaces) {
    for (const alt of iface.alternates) {
      // 0x02 = Communications, 0x0A = CDC Data.
      if (alt.interfaceClass === 0x02 || alt.interfaceClass === 0x0a) {
        return true;
      }
    }
  }
  return false;
}

function deviceFilters() {
  const f = [];
  if (badge?.bootloaderVid && badge?.bootloaderPid) {
    f.push({
      vendorId: usbId(badge.bootloaderVid),
      productId: usbId(badge.bootloaderPid),
    });
  }
  if (badge?.appVid && badge?.appPid) {
    f.push({ vendorId: usbId(badge.appVid), productId: usbId(badge.appPid) });
  }
  // Catch-all so a badge with an unexpected ID but a real DFU interface
  // still appears in the chooser.
  f.push({ classCode: DFU_IFACE_CLASS, subclassCode: DFU_IFACE_SUBCLASS });
  return f;
}

async function connect() {
  try {
    const chosen = await navigator.usb.requestDevice({
      filters: deviceFilters(),
    });
    await openDevice(chosen);
  } catch (e) {
    if (e && e.name === "NotFoundError") logWarn("device chooser cancelled");
    else logErr(`connect failed: ${e.message || e}`);
  }
}

async function openDevice(d) {
  device = d;
  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);

  el.devStatus.textContent = "connected";
  el.devStatus.classList.add("connected");
  el.devInfo.classList.remove("d-none");
  el.infoProduct.textContent = device.productName || "—";
  el.infoSerial.textContent = device.serialNumber || "—";
  el.infoVidpid.textContent = `${hex4(device.vendorId)}:${hex4(device.productId)}`;

  const iface = findDfuInterface(device);
  el.modeWarning.classList.add("d-none");

  if (iface) {
    dfuIfaceNum = iface.interfaceNumber;
    try {
      await device.claimInterface(dfuIfaceNum);
    } catch {
      // Some hosts need the alternate setting selected first.
      try {
        await device.selectAlternateInterface(dfuIfaceNum, 0);
      } catch {
        /* not fatal — retry the claim and let it throw if it really fails */
      }
      await device.claimInterface(dfuIfaceNum);
    }
    deviceMode = "dfu";
    el.infoMode.textContent = `bootloader (DFU 1.1, interface ${dfuIfaceNum})`;
    logOk(`DFU interface claimed: interface ${dfuIfaceNum}`);
  } else {
    dfuIfaceNum = null;
    deviceMode = looksLikeCdc(device) ? "app" : "unknown";
    el.infoMode.textContent =
      deviceMode === "app"
        ? "application firmware (CDC) — not flashable"
        : "no DFU or CDC interface found";
    el.modeWarning.innerHTML =
      deviceMode === "app"
        ? `This badge is running its application firmware, not the bootloader. ${badge?.dfuHint || ""}`
        : "This device exposes neither a DFU nor a CDC interface. Are you sure it is the right one?";
    el.modeWarning.classList.remove("d-none");
    logWarn("device is not in DFU mode");
  }

  updateFlashButton();
}

// --------------------------------------------------------------------------
// Flashing
// --------------------------------------------------------------------------

function setProgress(pct, label) {
  el.progress.value = Math.max(0, Math.min(100, pct));
  el.progLabel.textContent = label || "";
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function selectedFirmware() {
  const idx = Number(el.fwSelect.value);
  return badge?.firmware?.[idx] || null;
}

async function flash() {
  const fw = selectedFirmware();
  if (!device || deviceMode !== "dfu" || !fw) return;

  el.btnFlash.disabled = true;
  el.btnConnect.disabled = true;
  try {
    setProgress(0, "downloading…");
    logOk(`fetching ${fw.file}`);
    const resp = await fetch(fw.file);
    if (!resp.ok) throw new Error(`fetch ${fw.file}: HTTP ${resp.status}`);
    const bytes = new Uint8Array(await resp.arrayBuffer());
    logOk(`firmware loaded: ${bytes.length} bytes`);

    if (fw.sha256) {
      const got = await sha256Hex(bytes);
      if (got !== fw.sha256.toLowerCase()) {
        throw new Error(
          `checksum mismatch — refusing to flash (expected ${fw.sha256}, got ${got})`,
        );
      }
      logOk("SHA-256 verified");
    } else {
      logWarn("no SHA-256 in the registry — skipping integrity check");
    }

    const t0 = performance.now();
    await flashImage(
      { device, dfuIfaceNum },
      bytes,
      badge.blockSize || DEFAULT_BLOCK_SIZE,
      setProgress,
    );
    logOk(`flash complete in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
    setProgress(100, "done — power-cycle the badge");
  } catch (e) {
    logErr(`flash failed: ${e.message || e}`);
    setProgress(0, "failed");
    // Leave the device in a state the next attempt can recover from.
    if (device && dfuIfaceNum !== null) {
      try {
        const sess = { device, dfuIfaceNum };
        const st = await dfuGetStatus(sess);
        if (st.bState === STATE.dfuERROR) await dfuClrStatus(sess);
      } catch {
        /* device is probably gone; nothing to clean up */
      }
    }
  } finally {
    el.btnConnect.disabled = false;
    updateFlashButton();
  }
}

// --------------------------------------------------------------------------
// UI wiring
// --------------------------------------------------------------------------

function updateFlashButton() {
  el.btnFlash.disabled = !device || deviceMode !== "dfu" || !selectedFirmware();
}

function renderFirmwareNotes() {
  const fw = selectedFirmware();
  el.fwNotes.textContent = fw?.notes || "";
  // Some images need a follow-up step elsewhere (DOOM wants its WAD), so let
  // the registry attach a link. Built as an element rather than injected as
  // markup, so the notes stay plain text.
  if (fw?.moreUrl) {
    el.fwNotes.appendChild(document.createTextNode(" "));
    const a = document.createElement("a");
    a.href = fw.moreUrl;
    a.textContent = fw.moreLabel || "Read more →";
    el.fwNotes.appendChild(a);
  }
}

function selectBadge(idx) {
  badge = badges[idx] || null;
  if (!badge) return;

  el.dfuHint.innerHTML = badge.dfuHint || "";
  if (badge.docsUrl) {
    el.badgeDocs.href = badge.docsUrl;
    el.badgeDocs.classList.remove("d-none");
  } else {
    el.badgeDocs.classList.add("d-none");
  }

  el.fwSelect.innerHTML = "";
  const list = badge.firmware || [];
  if (list.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(no firmware published for this badge)";
    el.fwSelect.appendChild(opt);
  } else {
    list.forEach((fw, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = fw.label || fw.file;
      el.fwSelect.appendChild(opt);
    });
  }
  renderFirmwareNotes();
  updateFlashButton();
}

if (!("usb" in navigator)) {
  el.unsupported.classList.remove("d-none");
  el.btnConnect.disabled = true;
} else {
  el.btnConnect.addEventListener("click", connect);
  el.btnFlash.addEventListener("click", flash);
}

el.btnClearLog.addEventListener("click", () => {
  el.log.textContent = "";
});
el.fwSelect.addEventListener("change", () => {
  renderFirmwareNotes();
  updateFlashButton();
});
el.badgeSelect.addEventListener("change", (e) =>
  selectBadge(Number(e.target.value)),
);

selectBadge(0);
