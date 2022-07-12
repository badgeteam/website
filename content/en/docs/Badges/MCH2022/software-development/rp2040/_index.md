---
title: "Developing for the RP2040 Coprocessor"
linkTitle: "RP2040"
nodateline: true
weight: 1
---


# This voids your warranty!
# SERIOUSLY WE WON'T SUPPORT YOU IF YOU BRICK YOUR BADGE

# Introduction

- RP2040: aka Raspberry Pico. This is an onboard conprocessor that we
  are using as our USB Lifeline to the outside world. As such, if you
  break stuff here, you can easily brick your badge. Feel free to play
  around with it, but be aware: THIS VOIDS YOUR WARRANTY ... and not in
  a fun way. It's very unlikely we'll have the resource to help you fix
  the badge during the camp.

Press SELECT while you're powering on the Badge, this gets you into RP2 Boot mode:

```
$ lsusb 
...
Bus 001 Device 019: ID 2e8a:0003 Raspberry Pi RP2 Boot
...
```

this causes the USB connection to NOT appear as a serial device (acting as a
passthrough to the ESP), but instead as a USB mass storage device (MSD) and
will show up like a USB thumb drive. RP2040 Firmware you develop can be flashed
by copying it to this "drive".

