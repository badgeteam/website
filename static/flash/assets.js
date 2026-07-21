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
// For (B) the zip is unpacked in the browser — see zip.js. The badge's own
// archives are flat, since its FAT12 volume wants everything in the root, but
// CircuitPython's libraries live under lib/, so any directories in the archive
// are recreated. safePath() keeps that from escaping the chosen folder.

import {
  readCentralDirectory,
  inflateEntry,
  safePath,
  sha256Hex,
} from "./zip.js";

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
  intro: $("assets-intro"),
  driveHint: $("assets-drive-hint"),
  elsewhere: $("assets-elsewhere"),
  elsewhereText: $("assets-elsewhere-text"),
  elsewhereLink: $("assets-elsewhere-link"),
};

let badge = badges[0];

// Kept so the wording can be restored when switching back to an image that
// does not override it.
const DEFAULT_INTRO = el.intro ? el.intro.textContent : "";

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
// Copying to the badge drive
// --------------------------------------------------------------------------

/** Walk down, creating as needed, to the directory an entry belongs in. */
async function ensureDir(root, dirs) {
  let handle = root;
  for (const part of dirs) {
    handle = await handle.getDirectoryHandle(part, { create: true });
  }
  return handle;
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
      const path = safePath(entry.name);
      if (!path) {
        logErr(`skipped a suspicious path: ${entry.name}`);
        continue;
      }
      const data = await inflateEntry(buf, entry);
      const dir = await ensureDir(root, path.dirs);
      const handle = await dir.getFileHandle(path.name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();
      setProgress(i + 1, entries.length, `${i + 1}/${entries.length} ${path.name}`);
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

function currentFirmware() {
  return badge?.firmware?.[Number(el.fwSelect.value)] || null;
}

function refresh() {
  const assets = currentAssets();
  const fw = currentFirmware();

  // Some images have no asset zip because their data lives somewhere else
  // entirely — DOOM's in QSPI, CircuitPython's on its own CIRCUITPY drive.
  // Say where, instead of dropping the step and leaving a gap in the
  // numbering.
  if (!assets && fw?.nextStep && el.elsewhere) {
    card.classList.add("d-none");
    el.elsewhere.classList.remove("d-none");
    el.elsewhereText.textContent = fw.nextStep;
    el.elsewhereLink.href = fw.moreUrl || "#";
    el.elsewhereLink.textContent = fw.moreLabel || "Read more →";
    return;
  }
  el.elsewhere?.classList.add("d-none");

  if (!assets) {
    card.classList.add("d-none");
    return;
  }
  card.classList.remove("d-none");
  el.zipLink.href = assets.file;
  el.summary.textContent = assets.label || "";

  // CircuitPython's libraries go to CIRCUITPY, not the badge's own CYBR
  // volume, so let the payload override the wording rather than sending
  // people to the wrong drive.
  if (assets.intro) el.intro.textContent = assets.intro;
  else el.intro.textContent = DEFAULT_INTRO;
  const drive = assets.drive ? `${assets.drive}` : "CYBR…";
  el.driveHint.textContent =
    `Pick the ${drive} drive when your browser asks, and the files are written for you — no download, no unzipping.`;

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
