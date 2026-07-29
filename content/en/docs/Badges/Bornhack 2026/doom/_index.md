---
title: "DOOM"
linkTitle: "DOOM"
nodateline: true
weight: 10
---

The badge runs DOOM. E1M1, *Knee-Deep in the Dead*, appears on the badge's
e-paper panel at a few frames per second, in four levels of gray. The piezo
buzzer plays the music of the level.

The result is a slideshow, and you can play it.

{{% alert title="DOOM replaces the firmware and erases your saved data" color="warning" %}}
DOOM is a separate firmware image. It is not an app inside the normal firmware.
While DOOM is installed, the badge has no BornPets, no mesh and no clock. Write
the standard firmware again from the [Flash page](../flash/) to get the badge
back.

A change to DOOM is **destructive**. The WAD fills almost all of the badge's
2 MB QSPI flash. That same chip holds your pet and your settings (the KV store)
and the badge's asset files, and the WAD writes over them. You lose the pet and
the settings. After you write a normal firmware again, install its assets from
the [Flash page](../flash/) before the sprites come back.
{{% /alert %}}

## How to install it

DOOM needs two steps, because the game data is much too large for the badge's
USB drive. The firmware goes into the badge's program memory over USB. The game
data goes into the separate 2 MB QSPI flash chip over a serial connection.

1. Write the DOOM firmware on the [Flash page](../flash/), as you write any
   other image.
2. Power cycle the badge.
3. Upload a WAD with the loader below.

{{% alert title="A firmware write erases the game data" color="info" %}}
A write of any firmware over USB formats the QSPI region that holds the WAD.
Upload the WAD again after every firmware write. A normal start never touches
the WAD, so it stays through power cycles.
{{% /alert %}}

## Upload a WAD

{{< wadloader >}}

## Controls

| Input | Action |
| ----- | ------ |
| **Joystick** | Move, strafe and turn |
| **Joystick press** (*Fire*) | Shoot |
| **Execute** | Use, and open doors |
| **Cancel** | Change weapon. Held during the start, it enters WAD upload mode |
| **Execute + Cancel** | Turns the music on or off |

## If something goes wrong

**The browser shows no serial port.** The badge shows its serial console only in
WAD upload mode. Reset the badge while you hold **Cancel**, then try again.

**"Timed out waiting for the badge to ask for data".** The badge is connected,
but it is not in upload mode, so it asks for no transfer. Reset the badge while
you hold **Cancel**.

**The upload stops in the middle.** Nothing is damaged. The badge has no usable
WAD, and it returns to upload mode. Connect again and send the file again.

**DOOM starts, but it reports missing game data.** The firmware is installed and
the WAD is not. You get this state after every firmware write. Upload the WAD
above.

**Firefox and Safari show no Connect button.** Neither browser has Web Serial.
Use a Chromium-family browser, or send the blob from a terminal with a YMODEM
tool:

```
sb --ymodem-1k e1m1.blob < /dev/ttyACM0 > /dev/ttyACM0
```

## About the game data

Only one level fits. The blob above is about 1.8 MiB, which is about 92% of the
badge's QSPI flash. The asset pipeline in the
[cyberaegg-doom](https://codeberg.org/rarenerd/cyberaegg-doom) repository builds
it from the freely distributable **shareware** `doom1.wad`, and it cuts and
compresses the data. DOOM and its game data stay the property of id Software.

To build your own blob from a copy of `doom1.wad` that you have:

```
bash tools/build_assets.sh    # doom1.wad -> build/e1m1.blob
```

Then select that file in the loader instead of the prepared one.

## Source

The port is at [rarenerd/cyberaegg-doom](https://codeberg.org/rarenerd/cyberaegg-doom).
It is a fork of [next-hack/nRF52840Doom](https://github.com/next-hack/nRF52840Doom),
which comes from prBoom and GBADoom. The fork fits the engine to the badge's
e-paper display, its buttons and its power budget. The DOOM engine is under the
GPL.
