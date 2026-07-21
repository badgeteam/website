// SPDX-FileCopyrightText: Stichting Badge.Team
// SPDX-License-Identifier: MIT
//
// Installs the CircuitPython support libraries onto the badge's CIRCUITPY
// drive.
//
// Nothing in the examples works without these: importing cyberaegg_epd or the
// LoRa driver fails until they are in CIRCUITPY/lib. Copying them by hand
// means fetching a repository and getting a nested directory right, so this
// does it from the page instead.
//
// Unlike the badge's FAT12 asset drive, this payload has structure — the
// archive carries lib/ and lib/adafruit_display_text/ — so directories are
// created as needed rather than the names being flattened.

import { readCentralDirectory, inflateEntry, safePath, sha256Hex } from "./zip.js";

const $ = (id) => document.getElementById(id);

const card = $("pylib");
const configEl = $("pylib-config");
if (!card || !configEl) throw new Error("pylib: markup not present");

const payload = JSON.parse(configEl.textContent || "null");
if (!payload) throw new Error("pylib: nothing to install");

const el = {
  btnCopy: $("btn-pylib-copy"),
  zipLink: $("pylib-zip"),
  progress: $("pylib-progress"),
  progLabel: $("pylib-progress-label"),
  warning: $("pylib-fs-warning"),
  log: $("pylib-log"),
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

function setProgress(value, max, label) {
  el.progress.max = max;
  el.progress.value = value;
  el.progLabel.textContent = label;
}

/** Walk down (creating as we go) to the directory an entry belongs in. */
async function ensureDir(root, dirs) {
  let handle = root;
  for (const part of dirs) {
    handle = await handle.getDirectoryHandle(part, { create: true });
  }
  return handle;
}

async function install() {
  // The picker has to be opened straight from the click, or the browser
  // rejects it as not user-initiated.
  let root;
  try {
    root = await window.showDirectoryPicker({ mode: "readwrite" });
  } catch {
    return; // cancelled
  }

  el.btnCopy.disabled = true;
  try {
    setProgress(0, 1, "downloading…");
    const resp = await fetch(payload.file);
    if (!resp.ok) throw new Error(`fetch ${payload.file}: HTTP ${resp.status}`);
    const buf = await resp.arrayBuffer();

    if (payload.sha256) {
      const got = await sha256Hex(new Uint8Array(buf));
      if (got !== payload.sha256.toLowerCase()) {
        throw new Error(`checksum mismatch — refusing to copy (got ${got})`);
      }
      logOk("SHA-256 verified");
    }

    const entries = readCentralDirectory(buf);
    logOk(`archive contains ${entries.length} files`);

    let written = 0;
    for (const entry of entries) {
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
      written++;
      setProgress(written, entries.length, `${written}/${entries.length} ${entry.name}`);
    }

    setProgress(written, entries.length, "done — the libraries are installed");
    logOk(`copied ${written} files into lib/`);
  } catch (e) {
    logErr(`install failed: ${e.message || e}`);
    setProgress(0, 1, "failed");
  } finally {
    el.btnCopy.disabled = false;
  }
}

el.zipLink.href = payload.file;

if (!("showDirectoryPicker" in window)) {
  el.btnCopy.disabled = true;
  el.warning.classList.remove("d-none");
} else {
  el.btnCopy.addEventListener("click", install);
}

setProgress(0, 1, "idle");
