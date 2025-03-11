---
title: "MCH2022 Badge Hardware Hacking"
linkTitle: "Hardware Hacking"
nodateline: true
---

The badge is made for hacking, and the hardware is no exception. There are several *intended* ways to extend the badge, next to unlimited unintented ones.

If you have access to a 3D printer, an easy and worthwile hardware mod is to
print a knob for the joystick, such as [this
one](https://www.thingiverse.com/thing:5429071) or a [case](https://twitter.com/daveborghuis/status/1549144081825255424).

# Shitty Add-on

The badge has a [SAO](https://hackaday.com/2019/03/20/introducing-the-shitty-add-on-v1-69bis-standard/) header,
which can provide power, I2C, and 2 GPIOs to small accessories that can be plugged in.

# Qwiic

At the back of the badge there is a Qwiic connector hooked up to the ESP32 that is compatible with a large family of modules from Sparkfun, Adafruit and others.

# PMOD

On the side of the badge there is a PMOD connector hooked up to the FPGA that is compatible with a large family of modules from Digilent and others.

# May Contain Hardware Area

On the back of the badge there is a prototyping area with a grid of pads, as well as pads the expose I2C, power, and GPIOs.

Across the rest of the PCB are labeled pads that expose things like the LED serial data, audio signal, IR signal, various debug pads, and more.
