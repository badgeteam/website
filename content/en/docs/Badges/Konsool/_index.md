---
title: "Konsool badge"
linkTitle: "Konsool"
nodateline: true
weight: -2025
---

<img src="konsool-logo.svg" style="display: block; margin-left: auto; margin-right: auto; margin-bottom: 2rem; width: 60%">

<img src="konsool.svg" style="display: block; margin-left: auto; margin-right: auto; width: 60%;"/>

# Introduction

The device will be the portable computer you wish you had in the 80s. 
Complete with on-device programming environment, a high resolution 60Hz screen and a full QWERTY keyboard this device is all the computing power you will need on a hand held hackable device!

The connectivity of this device is unparalleled, since the SHA badge WIFI and Bluetooth connectivity have been the norm, this badge adds long range low speed connectivity (LoRa) allowing for long range mesh networking! 
Who doesn't want to talk to chat with friends over a kilometer away, no infrastructure needed!

Did we mention the dual core 400MHz Risc-V ESP32-P4 CPU?

## Tanmatsu or Konsool?

The **open-source badge design** is released under the **[CERN-OHL-P license](https://cern-ohl.web.cern.ch/home)**. This applies to both **Konsool** and **Tanmatsu**, which are essentially the same device.

- **Konsool** is an open design, freely available for anyone to modify, extend, and use as they see fit.  
- **Tanmatsu** is the **pre-assembled version** sold by **Nicolai Electronics**, eliminating the hassle of sourcing components and manufacturing the PCB.

Selling electronic devices involves additional requirements, such as **safety and environmental certifications**. **Badge.Team** appreciates that **Nicolai Electronics** takes on these responsibilities, offering the badge **practically at cost**.

By providing both an **open design** and **ready-to-use devices**, we aim to foster a **thriving ecosystem**, ensuring ongoing support and updates for the community.

## The Konsool hardware

​The Konsool is powered by the [ESP32-P4](https://en.wikipedia.org/wiki/ESP32#ESP32-P4) which is a high-performance system-on-chip (SoC) from Espressif, featuring a dual-core [RISC-V](https://en.wikipedia.org/wiki/RISC-V) CPU running up to 400 MHz with AI instruction extensions. 
It integrates high-speed peripherals, including [USB OTG](https://en.wikipedia.org/wiki/USB_On-The-Go) 2.0 HS and Ethernet. 
The ESP32-P4 is tailored for applications requiring rich [human](https://en.wikipedia.org/wiki/Human)-machine interfaces and power efficient computing. 
Making it (in our humble opinion) a good choice for a battery held device that humans interact with.

Additionally, an [ESP32-C6](https://www.espressif.com/sites/default/files/documentation/esp32-c6_datasheet_en.pdf) module provides WiFi, Bluetooth Low Energy, and [IEEE802.15.4](https://en.wikipedia.org/wiki/IEEE_802.15.4) wireless connectivity. This allows for internet access as well as compatibility with local mesh networks like [Thread](https://en.wikipedia.org/wiki/Thread_(network_protocol)) and [ZigBee](https://en.wikipedia.org/wiki/Zigbee), ideal for developers and enthusiasts.

A [LoRa](https://en.wikipedia.org/wiki/LoRa) radio module enables communication over LoRa networks, including long-range mesh services and classic (G)FSK modulation at either 433, 868 or 915MHz, depending on the module installed.

The device includes 16Mb of built-in flash storage for firmware and applications, expandable via a micro SD card slot. This slot supports SD cards at both standard and high-speed ([SDIO 3.0](https://www.sdcard.org/cms/wp-content/themes/sdcard-org/dl.php?f=PartE1_SDIO_Simplified_Specification_Ver3.00.pdf)).

User interaction is provided through a QWERTY keyboard and a [MIPI](https://en.wikipedia.org/wiki/MIPI_Alliance) DSI display.

The expansion port enhance Konsool's versatility by supporting expansion an board on the back of the the device.
Exposing SPI, I2C, USB (2.0) and GPIO to the expansion board provides ample connectivity options for expansion board designs. 

The side-facing [CATT](./hardware/pinout/connectors/catt/) port provides connectivity to a [JTAG](https://en.wikipedia.org/wiki/JTAG) debugger, and various [PMOD](https://en.wikipedia.org/wiki/Pmod_Interface) and [SAO](https://hackaday.io/project/52950-shitty-add-ons)-compatible accessories.

A [QWIIC](https://www.sparkfun.com/qwiic) compatible connector allows the device to interface with [numerous](https://www.sparkfun.com/qwiic#products) sensors from manufacturers like Sparkfun and Adafruit.

The ESP32-P4 also includes hardware-accelerated encoding and decoding of [h264](https://en.wikipedia.org/wiki/Advanced_Video_Coding) video through its MIPI DSI and CSI interfaces. This powerful CPU can record video from devices such as a Raspberry Pi camera, encode it, and stream it wirelessly over WiFi.

Custom front panels are feasible using the [provided information](/docs/badges/konsool/hardware/frontpanel/), and 3D printable case designs are also available for those interested in additional customization. (A Case design in FreeCAD format coming soon)

## The team

The Konsool would not have been possible without the help of our amazing volunteers.

| Nick          | Name              | Role                                |
| ------------- | ----------------- | ----------------------------------- |
| r3nz3         | Renze Nicolai     | Hardware and Software development   |
| Ranzbak       | Paul Honig        | Hardware, Testing and Documentation |
| Jhaand        | Jelle Haandrikman | Testing and review                  |
| RobotMan2412  | Julian Scheffers  | Software and Testing                |
| Ankhaneko     | Nikolett          | Artwork and more                    |
| Orange Murker | Luna              | Software and Testing                |
| NightOwlNL    | Emiel Bart        | Documentation                       |
| Noor          |                   | Testing                             |
| Jay           | Jay Visschedijk   | Ergonomic board outline             |
| Wietsman      | Wietse Boonstra   | Component footprints                |
| Kliment       | Kliment Yanev     | Review hardware                     |
| Anus          | Anne Jan Brouwer  | Software                            |

<img src="konsool_mascots.svg" width="80%"/>
