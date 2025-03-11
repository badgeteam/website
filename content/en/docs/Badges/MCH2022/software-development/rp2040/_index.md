---
title: "Developing for the RP2040 Coprocessor"
linkTitle: "RP2040"
nodateline: true
weight: 1
---

## Introduction

RP2040: aka Raspberry Pico. This is an onboard coprocessor that handles
two USB <-> serial bridges and acts as an IO extender.

At this point in time, we have no way for the apps to automatically load new firmware to the RP2040 along with their main functionality on the ESP32, but manually flashing a custom firmware using the recovery method is possible, although not recommended.

Should you like to experiment with the RP2040 firmware,
[its repo resides here](https://github.com/badgeteam/mch2022-firmware-rp2040).


## Install custom firmware

Press `SELECT` while you're powering on the Badge, this gets you into RP2 Boot mode:

```
$ lsusb
...
Bus 001 Device 019: ID 2e8a:0003 Raspberry Pi RP2 Boot
...
```

This causes the USB connection to NOT appear as a serial device (acting as a
passthrough to the ESP), but instead as a USB mass storage device (MSD) and
will show up like a USB thumb drive.

## Recover

No fears: The badge is unbrickable, the RP2040 has a hardware-triggered bootloader in ROM and is able to reflash the ESP32. Therefore you can always recover using the USB connection.

Dowload the current known-good firmware image for the RP2040 [https://ota.bodge.team/mch2022-rp2040/mch2022.uf2](https://ota.bodge.team/mch2022-rp2040/mch2022.uf2) and copy it into the mass storage folder. Then reset the badge, and you can go on with re-flashing the ESP32 firmware. By the way, `ota.badge.team` has an old certificate on purpose. It is ok.
