---
title: "MCH2022 badge"
linkTitle: "MCH2022"
nodateline: true
weight: -10
---

The MCH2022 badge is our most advanced badge yet. Shaped like a game console
this badge is a powerhouse filled with cool technology. 

Once assembled, you can use the badge to display your name, write Python
code and maybe play a game or find an Easter Egg, but don't forget: the
real fun starts when you hack it to make it your own!

![MCH2022 badge](mch2022.jpg)

# Getting Started

We've assembled some resources to [quickly get
started](./getting-started).

# Getting Help (and helping ...)

Check out [these resources](./support) if you run into trouble.

# The Hardware

The badge contains an Espressif ESP32 Wrover-e WiFi module with 16MB of
flash storage and 8MB of PSRAM, an Raspberry Pi RP2040 microcontroller
chip for advanced USB communication and board management and a Lattice
ICE40UP5K FPGA for hardware accelerated graphics.

It also contains a bunch of (stuff TODO elaborate).

The hardware is described in detail in the [hardware section](./hardware).

# The Software

The ESP32 loads an [application chooser](getting-started/software) menu when you first power it on.
Once loaded, you can launch a number of preinstalled applications: 

- the Name-Tag app
- a Micropython scripting environment
- a sensor playground for the Bosch sensors
 
and the app contains a link to the Hatchery an app store you can use to
load more apps. And more importantly, where you can publish app you
[write yourself](software-development). 

The software is still in active development, more information will be
published here soon.
