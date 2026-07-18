---
title: "Hardware"
linkTitle: "Hardware"
nodateline: true
weight: 7
---

The Cyber Ægg is a low-power LoRa badge built around a Nordic **nRF52840** microcontroller. The design goal is to run for the entire week of BornHack on a single battery charge, so a lot of care goes into keeping the power consumption down in both hardware and firmware.

The full KiCad design is open source at [Ranzbak/bornhack2026-hardware](https://codeberg.org/Ranzbak/bornhack2026-hardware).

{{% alert title="Prototype" color="warning" %}}
At the time of writing the design is still at prototype stage. Some of the RF circuits (NFC, LoRa, Bluetooth) still carry U.FL / IPEX connectors to make tuning easier, and the on-PCB antennas are not yet fully characterised. Consider this design **beta** — do not order your own boards yet.
{{% /alert %}}

## Overview

| Component | Part | Interface |
| --------- | ---- | --------- |
| Microcontroller | Nordic **nRF52840** | — |
| Display | 1.54" black/red/white e-paper, 152 × 152, SSD1675 / SSD1675B controller | SPI |
| LoRa radio | Semtech **SX1262** | SPI |
| Bluetooth Low Energy | nRF52840 built-in radio | — |
| NFC | nRF52840 NFC tag PHY + on-PCB coil | — |
| Input | 5-way joystick + `Execute` / `Cancel` buttons | GPIO |
| Feedback | RGB LED, piezo buzzer | GPIO / PWM |
| Power | Li-ion battery, USB-C for power and data | — |

{{% alert title="Expansion connector pinout" color="danger" %}}
There is a QWIIC like I2C expansion connector on the board. Be aware that we made a small design mistake: the 3.3v and GND signals have been swapped around. Make sure to use a modified cable before connecting any QWIIC peripherals.
{{% /alert %}}

## Display

The badge uses a 1.54 inch tri-colour (black / red / white) e-paper display with a resolution of **152 × 152** pixels, driven by an SSD1675 / SSD1675B controller. E-paper keeps the badge readable in bright camp sunlight and draws no power to hold an image, which is a big help for the week-long battery goal.

By default the panel is driven with the waveform LUT stored in its own OTP. Advanced users can override this with a calibrated waveform (for example a faster refresh) by dropping a `LUT.CFG` file on the USB drive — see the firmware's [`LUT.md`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/LUT.md). You can generate one with the [ssd1675-calibration](https://codeberg.org/Ranzbak/ssd1675-calibration) tool. Holding *Fire* while booting always forces the safe built-in waveform.

## Manual input

Because the Cyber Ægg is inspired by the 90's Tamagotchi egg-shaped toy, the buttons carry the same names:

| Button | Function |
| ------ | -------- |
| **Select** | Navigate through the menu options |
| **Execute** | Start the option under the cursor |
| **Cancel** | Cancel the current operation |

To make navigation more intuitive, the *Select* button is implemented as a 5-way joystick with a press action.

## Bluetooth

Bluetooth Low Energy is provided directly by the nRF52840. It operates in the 2.4 GHz band and uses an on-PCB antenna based on a Texas Instruments reference design (included in the standard KiCad 9 library). See the TI application note [SWRA228](https://www.ti.com/lit/an/swra228c/swra228c.pdf) for details.

## LoRa

Long-range connectivity is provided by a dedicated Semtech **SX1262** radio with the matching/balun circuit specified in the Semtech application note *AN1200.54*. The LoRa antenna is a Texas Instruments design documented in [SWRA416](https://www.ti.com/lit/an/swra416/swra416.pdf). On the network side the badge speaks [MeshCore](https://meshcore.io/), so it can join the wider camp mesh out of the box.

## NFC

The nRF52840 includes an NFC PHY, used here to drive a resonant circuit consisting of an on-PCB coil (roughly 2.8 µH) and tuning capacitors, forming a tank circuit matched to **13.56 MHz**. The nRF52840 only supports **tag** functionality (not reader mode), which the firmware uses for location-based games and station taps.

## Expansion connector

There is a QWIIC like I2C expansion connector on the board. Be aware that we made a small design mistake: the 3.3v and GND signals have been swapped around. Make sure to use a modified cable before connecting any QWIIC peripherals.

{{% alert title="Fix the cable — cross the two power wires" color="warning" %}}
A standard QWIIC / JST-SH 4-pin cable carries **GND · 3V3 · SDA · SCL**. Because the badge swaps 3.3 V and GND, plugging in a stock cable feeds **reversed power** into your peripheral — don't do it.

To make a corrected cable, swap the two power wires on **one end only** (leave the other end standard so it still mates with the peripheral):

1. On the badge end of the cable, lift the small locking tab on the JST-SH housing and gently pull the **GND** and **3V3** contacts out (a fine pick or tweezers works).
2. Swap them: the wire that was in the GND slot goes into the 3V3 slot and vice-versa. The two data wires (SDA, SCL) stay put.
3. Push both contacts back until they click, and confirm nothing is loose.

The data lines are unaffected, so only the two power contacts move. Mark the fixed cable so you don't mix it up with a standard one. If you'd rather not re-pin, cut and re-solder the red (3V3) and black (GND) wires crossed, or just keep a dedicated "badge only" cable.
{{% /alert %}}

The badge carries a connector that should have been [QWIIC](https://www.sparkfun.com/qwiic) compatible. QWIIC is a standardised I²C connector used by a large range of SparkFun and third-party breakout boards. Two 10 kΩ pull-up resistors are fitted on the board, and the nRF52840's internal pull-ups can be enabled as well when the bus capacitance is high.

The firmware can also drive an optional **Nicolai-Electronics I²C keyboard** on this bus for typing names and mesh messages — plug it in (with the corrected cable) and text entry uses the physical keys, with Shift / Alt one-shot toggles and an alt-symbol layer matching the silkscreen. Without a keyboard the badge falls back to the on-screen joystick picker automatically.

## Power

The badge is powered by a LiPo battery and charged over USB-C. Bluetooth is disabled while USB is connected to keep the charging path simple, so unplug the badge when you want to pair with the MeshCore app.
