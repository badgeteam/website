---
title: "DOOM"
linkTitle: "DOOM"
nodateline: true
weight: 10
---

Yes, it runs DOOM. E1M1 — *Knee-Deep in the Dead* — renders on the badge's
e-paper panel at a couple of frames per second, in four levels of grey, with the
level's music picked out on the piezo buzzer.

It is a slideshow, and it is genuinely playable.

{{% alert title="DOOM replaces the badge firmware" color="warning" %}}
This is a separate firmware image, not an app inside the normal one. While DOOM
is installed there is no BornPets, no mesh, no clock — flash the standard
firmware again from the [Flash page](../flash/) to get the badge back. Nothing
is lost by switching; your pet and settings live in flash and survive.
{{% /alert %}}

## How to install it

Getting DOOM running takes two steps, because the game data is far too big to
sit on the badge's little USB drive. The firmware goes into the badge's program
memory over USB; the game data goes into the separate 2 MB QSPI flash chip over
a serial connection.

1. **Flash the DOOM firmware** on the [Flash page](../flash/), the same way as
   any other image, then power-cycle the badge.
2. **Upload a WAD** with the loader below.

{{% alert title="Flashing wipes the game data" color="info" %}}
Writing any firmware over USB reformats the QSPI region where the WAD lives, so
you need to upload the WAD again after every reflash. Once it is there a normal
boot never touches it, so it survives ordinary power-cycles indefinitely.
{{% /alert %}}

## Upload a WAD

{{< wadloader >}}

## Controls

| Input | Action |
| ----- | ------ |
| **Joystick** | Move, strafe and turn |
| **Joystick press** (*Fire*) | Shoot |
| **Execute** | Use / open doors |
| **Cancel** | Cycle weapon — and, held at boot, enter WAD upload mode |
| **Execute + Cancel** | Toggle the music |

## If something goes wrong

**The browser never shows a serial port.** The badge only presents its serial
console in WAD upload mode. Reset it while holding **Cancel** and try again.

**"Timed out waiting for the badge to ask for data".** The badge is connected
but not in upload mode, so nothing is asking for a transfer. Reset holding
**Cancel**.

**The upload fails part-way.** Nothing is damaged — the badge simply has no
usable WAD and drops back into upload mode. Reconnect and send it again.

**DOOM boots but complains about missing game data.** The firmware is installed
and the WAD is not, which is exactly what you get after a fresh flash. Upload it
above.

**Firefox or Safari show no Connect button.** Neither ships Web Serial. Use a
Chromium-family browser, or send the blob from a terminal with a YMODEM tool:

```
sb --ymodem-1k e1m1.blob < /dev/ttyACM0 > /dev/ttyACM0
```

## About the game data

Only one level fits: the blob offered above is about 1.8 MiB, roughly 92% of the
badge's QSPI flash. It is built from the freely distributable **shareware**
`doom1.wad`, trimmed and compressed by the asset pipeline in the
[cyberaegg-doom](https://codeberg.org/rarenerd/cyberaegg-doom) repository. DOOM and
its game data remain the property of id Software.

To build your own from a copy of `doom1.wad` you already have:

```
bash tools/build_assets.sh    # doom1.wad -> build/e1m1.blob
```

Then pick that file in the loader instead of the prepared one.

## Source

The port lives at [rarenerd/cyberaegg-doom](https://codeberg.org/rarenerd/cyberaegg-doom).
It is a fork of [next-hack/nRF52840Doom](https://github.com/next-hack/nRF52840Doom)
(of prBoom and GBADoom lineage), re-fitted to the badge's e-paper display,
buttons and power budget. The DOOM engine is licensed under the GPL.
