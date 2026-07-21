// SPDX-FileCopyrightText: Stichting Badge.Team
// SPDX-License-Identifier: MIT
//
// Asset installer for the /flash/ page.
//
// Firmware alone is not enough: the badge also wants its sprite, sponsor and
// calendar files in the root of the FAT12 volume it exposes over USB. This
// module offers two ways to get them there.
//
//   A. Download the zip and unpack it yourself. Works in every browser.
//   B. Write the files straight onto the badge drive with the File System
//      Access API, so there is no download-and-unzip step at all.
//
// For (B) the zip is unpacked in the browser. Rather than ship a zip library,
// we walk the central directory by hand and inflate each entry with the
// platform's DecompressionStream — the archive is plain deflate with flat,
// stored-name entries, which is the easy case.

const $ = (id) => document.getElementById(id);

const configEl = $("flasher-config");
const card = $("assets-card");
if (!configEl || !card) throw new Error("assets: markup not present");

const badges = JSON.parse(configEl.textContent || "[]");
if (badges.length === 0) throw new Error("assets: no badges registered");

const el = {
  badgeSelect: $("badge-select"),
  fwSelect: $("firmware-select"),
  zipLink: $("assets-zip"),
  summary: $("assets-summary"),
  btnCopy: $("btn-copy-assets"),
  chkWipe: $("chk-wipe"),
  fsWarning: $("assets-fs-warning"),
  progress: $("assets-progress"),
  progLabel: $("assets-progress-label"),
  log: $("log"),
};

let badge = badges[0];

function logLine(msg, cls) {
  if (!el.log) return;
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
// Minimal ZIP reader (no zip64 — these archives are a few hundred KiB).
// --------------------------------------------------------------------------

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

function findEocd(view) {
  // The EOCD is at the very end, but a trailing comment can push it back by
  // up to 64 KiB. Scan backwards for the signature.
  const maxBack = Math.min(view.byteLength, 0xffff + 22);
  for (let i = view.byteLength - 22; i >= view.byteLength - maxBack; i--) {
    if (i >= 0 && view.getUint32(i, true) === SIG_EOCD) return i;
  }
  throw new Error("not a zip file (no end-of-central-directory record)");
}

/** @returns {Array<{name: string, method: number, start: number, compressedSize: number}>} */
function readCentralDirectory(buf) {
  const view = new DataView(buf);
  const eocd = findEocd(view);
  const count = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);

  const entries = [];
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(ptr, true) !== SIG_CENTRAL) {
      throw new Error(`corrupt central directory at entry ${i}`);
    }
    const method = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);
    const name = decoder.decode(new Uint8Array(buf, ptr + 46, nameLen));

    // The local header repeats the name and may carry a *different* extra
    // field length, so the data offset has to come from the local header.
    if (view.getUint32(localOffset, true) !== SIG_LOCAL) {
      throw new Error(`corrupt local header for ${name}`);
    }
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLen + localExtraLen;

    // Directory entries are stored with a trailing slash and no content.
    if (!name.endsWith("/")) {
      entries.push({ name, method, start, compressedSize });
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function inflateEntry(buf, entry) {
  const raw = new Uint8Array(buf, entry.start, entry.compressedSize);
  if (entry.method === 0) return raw; // stored
  if (entry.method !== 8) {
    throw new Error(`${entry.name}: unsupported compression method ${entry.method}`);
  }
  const stream = new Blob([raw])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// --------------------------------------------------------------------------
// Copying to the badge drive
// --------------------------------------------------------------------------

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function wipeDirectory(dir) {
  const names = [];
  for await (const [name] of dir.entries()) {
    // Leave dotfiles alone — they are the host OS's, not the badge's.
    if (!name.startsWith(".")) names.push(name);
  }
  for (const name of names) {
    await dir.removeEntry(name, { recursive: true });
    logOk(`removed ${name}`);
  }
}

function setProgress(value, max, label) {
  el.progress.max = max;
  el.progress.value = value;
  el.progLabel.textContent = label;
}

/**
 * Assets belong to a firmware image, not to the badge: editions ship
 * different sprite sets, and installing the wrong one leaves gaps.
 */
function currentAssets() {
  const fw = badge?.firmware?.[Number(el.fwSelect.value)];
  return fw?.assets || null;
}

async function copyToBadge() {
  const assets = currentAssets();
  if (!assets) return;

  // Ask for the directory *first*: the picker must be opened directly from
  // the click, or the browser rejects it as not user-initiated.
  let root;
  try {
    root = await window.showDirectoryPicker({ mode: "readwrite" });
  } catch {
    return; // cancelled
  }

  el.btnCopy.disabled = true;
  try {
    setProgress(0, 1, "downloading…");
    const resp = await fetch(assets.file);
    if (!resp.ok) throw new Error(`fetch ${assets.file}: HTTP ${resp.status}`);
    const buf = await resp.arrayBuffer();

    if (assets.sha256) {
      const got = await sha256Hex(new Uint8Array(buf));
      if (got !== assets.sha256.toLowerCase()) {
        throw new Error(`checksum mismatch — refusing to copy (got ${got})`);
      }
      logOk("SHA-256 verified");
    }

    const entries = readCentralDirectory(buf);
    logOk(`archive contains ${entries.length} files`);

    if (el.chkWipe.checked) {
      setProgress(0, 1, "wiping…");
      await wipeDirectory(root);
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const data = await inflateEntry(buf, entry);
      // Entries are flat filenames; guard anyway so a crafted archive cannot
      // escape the directory the user picked.
      const name = entry.name.split("/").pop();
      if (!name || name === "." || name === "..") continue;
      const handle = await root.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();
      setProgress(i + 1, entries.length, `${i + 1}/${entries.length} ${name}`);
    }

    setProgress(entries.length, entries.length, "done — now eject the drive");
    logOk(`copied ${entries.length} files — eject the drive before unplugging`);
  } catch (e) {
    logErr(`asset copy failed: ${e.message || e}`);
    setProgress(0, 1, "failed");
  } finally {
    el.btnCopy.disabled = false;
  }
}

// --------------------------------------------------------------------------
// UI wiring
// --------------------------------------------------------------------------

function syncWipeLabel() {
  el.btnCopy.textContent = el.chkWipe.checked
    ? "Erase the drive, then copy assets"
    : "Copy assets to the badge drive";
  el.btnCopy.classList.toggle("btn-danger", el.chkWipe.checked);
  el.btnCopy.classList.toggle("btn-primary", !el.chkWipe.checked);
}

function refresh() {
  const assets = currentAssets();
  if (!assets) {
    card.classList.add("d-none");
    return;
  }
  card.classList.remove("d-none");
  el.zipLink.href = assets.file;
  el.summary.textContent = assets.label || "";
  setProgress(0, 1, "idle");
}

const haveFsAccess = "showDirectoryPicker" in window;
if (!haveFsAccess) {
  el.btnCopy.disabled = true;
  el.fsWarning.classList.remove("d-none");
} else {
  el.btnCopy.addEventListener("click", copyToBadge);
}

el.chkWipe.addEventListener("change", syncWipeLabel);
el.fwSelect.addEventListener("change", refresh);
// flasher.js repopulates the firmware list on a badge change; it registers
// its listener first (its module loads first), so by the time this one runs
// the new list is already in place.
el.badgeSelect.addEventListener("change", (e) => {
  badge = badges[Number(e.target.value)] || badges[0];
  refresh();
});

syncWipeLabel();
refresh();
