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

## The Konsool brain

Konsool is powered by the Espressif ESP32-P4 SoC, their powerhouse RISC-V microcontroller. 
With its 400MHz dual-core processor and 32MB of built-in PSRAM it's the ideal microcontroller for powerful processing in a microcontroller package.

Next to that an ESP32-C6 for WiFi, Bluetooth Low Energy, and IEEE802.15.4 wireless radio module. 
This module enables wireless internet access, as well as access to local mesh networking like Thread and ZigBee in a hacker friendly way.

A LoRa radio module provides access to LoRa networks such as long distance mesh network services and (G)FSK modulated classic 433 or 868MHz communication, depending on the LoRa module installed.

The device has 16MB of built-in flash storage for firmware and applications. Using a micro SD card, even more storage can be added.
The micro SD card socket supports SD cards at 3.3v and 1.8v voltage levels (SDIO 3) for extra fast transfer speeds.

The user interface consists of a QWERTY keyboard and a MIPI DSI display.

Two expansion ports enable the user to add extra functionality. 
For example a battery expansion on the back while the side facing expansion port allows for easily connecting a wide variety of PMOD and SAO compatible accessories.

A QWIIC style expansion connector allows connecting the device to a wide range of sensors available from manufacturers such as Sparkfun and Adafruit, it supports both the I2C and the new I3C communication bus standards.


The P4 also supports hardware accelerated encoding and decoding of **h264**, in combination with MIPI DSI / CSI interfaces. This CPU is powerful enough to record video via a Raspberry pi camera, encoded it, and streamed over wifi to the internet!

Using the provided information, custom front panels are a viable option.
And if a case is something you like, 3D printable designs are available.

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
