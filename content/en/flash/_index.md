---
title: "Flash your badge"
linkTitle: "Flash"
menu:
  main:
    weight: 25
    pre: <i class='fas fa-bolt'></i>
nodateline: true
weight: 25
---

Flash firmware onto your badge straight from this page — no toolchain, no
drivers, no command line. The browser talks to the badge over USB and writes
the image itself.

{{% alert title="Chromium-family browsers only" color="warning" %}}
This uses [WebUSB](https://developer.mozilla.org/en-US/docs/Web/API/USB), which
only Chrome, Edge, Brave, Opera and Arc implement. Firefox and Safari do not
ship it and never show the device chooser. On those, flash from a terminal with
[`dfu-util`](https://dfu-util.sourceforge.net/) instead.

Linux users: you need a udev rule granting your user access to the bootloader,
otherwise the device appears in the chooser but fails to open.
{{% /alert %}}

{{< flasher >}}

## If something goes wrong

**The device chooser is empty.** The badge is not in DFU mode. Put it in the
bootloader first (for the Cyber Ægg: unplug, hold **Execute**, plug back in —
the LED blinks red), then click *Connect* again.

**It connects but says "application firmware (CDC)".** Same cause: you reached
the running firmware rather than the bootloader. Power-cycle into DFU mode.

**"Failed to open the device" on Linux.** A udev rule is missing. The badge's
own repository ships one — install it, replug, and retry.

**The flash stopped part-way.** Nothing is bricked. The bootloader writes
directly to the application partition, so an interrupted write just leaves the
badge sitting in DFU mode. Reconnect and flash again.

**Checksum mismatch.** The download did not match the hash published alongside
it and was refused before anything was written. Reload the page and retry; if it
persists, report it.

## Flashing without a browser

Every image offered here is a plain `.bin` for the application partition, so
`dfu-util` takes it directly:

```
dfu-util -d 1915:521f -D cyber-aegg.bin
```

## Adding a badge or a firmware image

The flasher is driven entirely by `data/firmwares.toml` in the
[website repository](https://github.com/badgeteam/website). Add the image under
`static/firmware/<badge-id>/`, record it in that file together with its
`sha256sum`, and it appears here — there is no backend to deploy.

Two constraints worth knowing:

* **Images must be hosted on this site.** A cross-origin download needs CORS
  headers, and release assets on Codeberg and GitHub do not send them.
* **Only application images.** A combined image that includes the bootloader
  (for the Cyber Ægg, `cyber-aegg-full.bin`) starts at address `0x00000000` and
  is meant for SWD / J-Link recovery. DFU writes the application partition, so
  publishing a combined image here would brick badges.
