---
title: "Flash your badge"
linkTitle: "Flash"
nodateline: true
weight: 9
---

This page writes firmware to your badge. You need no toolchain, no drivers and
no command line. The browser talks to the badge over USB and writes the image.
It can install the badge's asset files in the same session.

{{% alert title="Chromium-family browsers only" color="warning" %}}
This page uses [WebUSB](https://developer.mozilla.org/en-US/docs/Web/API/USB).
Only Chrome, Edge, Brave, Opera and Arc have it. Firefox and Safari do not, and
they never show the device chooser. On those browsers, write the firmware from a
terminal with [`dfu-util`](https://dfu-util.sourceforge.net/).

On Linux you also need a udev rule that gives your user access to the
bootloader. Without that rule the device appears in the chooser, but it does not
open.
{{% /alert %}}

{{< flasher >}}

## If something goes wrong

**The device chooser is empty.** The badge is not in DFU mode. Put it in the
bootloader first. On the Cyber Ægg, slide the **ON/OFF** switch at the top left
of the front off, then back on, while you hold **Execute**. The LED then blinks
red. Click *Connect* again. The battery keeps the badge running, so a
disconnection of USB does not restart it.

**The page connects, but it reports "application firmware (CDC)".** The cause is
the same. You reached the running firmware, not the bootloader. Power cycle the
badge into DFU mode.

**"Failed to open the device" on Linux.** A udev rule is missing. The badge's own
repository has one. Install the rule, connect the badge again, and retry.

**The write stopped in the middle.** Nothing is damaged. The bootloader writes
directly to the application partition, so an interrupted write leaves the badge
in DFU mode. Connect again and write again.

**Checksum mismatch.** The download did not match the published hash, and the
page refused it before it wrote anything. Load the page again and retry. If the
error continues, report it.

**The badge reports "No sprites on flash".** The firmware is installed, but the
asset files are not. Do step 5 above, then power cycle the badge.

**I flashed DOOM, and nothing happens or it asks for game data.** The firmware is
only half of DOOM. DOOM does not use the USB drive. Its game data goes into the
badge's QSPI flash over a serial connection. [Upload a WAD](../doom/) before you
play.

**Sprites are missing or wrong after a change of edition.** Each firmware image
has its own asset set, and the Community Edition draws many more sprites than
the standard image. Install the assets of the image you wrote. Step 5 follows
your choice in step 3 automatically.

**No drive appears for the assets.** The badge shows its USB drive only in DFU
mode, the mode you write from. If you already power cycled into the new
firmware, enter DFU mode again.

**The copy finished, but the badge looks empty.** Eject the drive in your file
manager before you disconnect it. Until you do that, your operating system can
still hold the data in its cache.

## Flashing without a browser

Every image on this page is a plain `.bin` file for the application partition,
so `dfu-util` takes it directly:

```
dfu-util -d 1915:521f -D cyber-aegg.bin
```

## Adding a badge or a firmware image

`data/firmwares.toml` in the
[website repository](https://github.com/badgeteam/website) drives the flasher.
Put the image in `static/firmware/<badge-id>/`, record it in that file with its
`sha256sum`, and it appears here. There is no backend to deploy.

Asset payloads work in the same way. Build the archive with flat,
deflate-compressed entries. Put it in `static/assets/<badge-id>/`, and point the
badge's `assets` entry at it:

```
cd assets/to-badge && zip -rX -9 cyber-aegg-assets.zip .
```

Two constraints are important:

* **This site must serve the images.** A cross-origin download needs CORS
  headers, and the release assets of Codeberg and GitHub do not send them.
* **Application images only.** A combined image that holds the bootloader
  (`cyber-aegg-full.bin` on the Cyber Ægg) starts at address `0x00000000`, and
  it is for SWD or J-Link recovery. DFU writes the application partition, so a
  combined image here would damage badges.
