// SPDX-FileCopyrightText: Stichting Badge.Team
// SPDX-License-Identifier: MIT
//
// Just enough ZIP to unpack the payloads this site serves, so we do not have
// to ship a compression library: walk the central directory by hand and let
// the platform's DecompressionStream do the inflating. The archives are built
// by us, deliberately as plain deflate with no zip64, which is the easy case.

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

function findEocd(view) {
  // The end-of-central-directory record sits at the very end, but a trailing
  // comment can push it back by up to 64 KiB. Scan backwards for it.
  const maxBack = Math.min(view.byteLength, 0xffff + 22);
  for (let i = view.byteLength - 22; i >= view.byteLength - maxBack; i--) {
    if (i >= 0 && view.getUint32(i, true) === SIG_EOCD) return i;
  }
  throw new Error("not a zip file (no end-of-central-directory record)");
}

/**
 * @returns {Array<{name: string, method: number, start: number, compressedSize: number}>}
 *   one entry per file; directory entries are dropped.
 */
export function readCentralDirectory(buf) {
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
    // field length, so the data offset has to come from there.
    if (view.getUint32(localOffset, true) !== SIG_LOCAL) {
      throw new Error(`corrupt local header for ${name}`);
    }
    const localNameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLen + localExtraLen;

    // Directories are stored as empty entries with a trailing slash; the
    // writer creates them as needed, so they are of no interest here.
    if (!name.endsWith("/")) {
      entries.push({ name, method, start, compressedSize });
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export async function inflateEntry(buf, entry) {
  const raw = new Uint8Array(buf, entry.start, entry.compressedSize);
  if (entry.method === 0) return raw; // stored
  if (entry.method !== 8) {
    throw new Error(
      `${entry.name}: unsupported compression method ${entry.method}`,
    );
  }
  const stream = new Blob([raw])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Split an archive path into safe directory segments plus a filename.
 *
 * Archive paths are attacker-controlled in the general case, so anything that
 * could climb out of the directory the user picked is rejected outright rather
 * than sanitised into something surprising.
 *
 * @returns {{dirs: string[], name: string} | null} null if the path is unsafe.
 */
export function safePath(rawName) {
  if (rawName.startsWith("/") || /^[A-Za-z]:/.test(rawName)) return null;
  const parts = rawName.split(/[/\\]/).filter((p) => p !== "" && p !== ".");
  if (parts.some((p) => p === "..")) return null;
  if (parts.length === 0) return null;
  const name = parts.pop();
  return { dirs: parts, name };
}

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
