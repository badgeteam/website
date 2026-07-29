---
title: "Hardware"
linkTitle: "Hardware"
nodateline: true
weight: 7
---

The Cyber Ægg is a low-power LoRa badge around a Nordic **nRF52840** microcontroller. The design goal is one battery charge for the full week of BornHack. The hardware and the firmware therefore keep the power consumption low.

The full KiCad design is open source, at [Ranzbak/bornhack2026-hardware](https://codeberg.org/Ranzbak/bornhack2026-hardware).

{{% alert title="Prototype" color="warning" %}}
The design is a prototype at this time. Some of the RF circuits, for NFC, LoRa and Bluetooth, still have U.FL and IPEX connectors, which make the tuning easier. We also did not fully characterize the antennas on the PCB. Treat this design as **beta**. Do not order your own boards yet.
{{% /alert %}}

## Overview

| Component | Part | Interface |
| --------- | ---- | --------- |
| Microcontroller | Nordic **nRF52840** | — |
| Display | 1.54 inch black, red and white e-paper, 152 × 152, SSD1675 / SSD1675B controller | SPI |
| LoRa radio | Semtech **SX1262** | SPI |
| Bluetooth Low Energy | Built-in radio of the nRF52840 | — |
| NFC | NFC tag PHY of the nRF52840, with a coil on the PCB | — |
| Input | 5-way joystick, `Execute` and `Cancel` buttons | GPIO |
| Feedback | RGB LED, piezo buzzer | GPIO / PWM |
| Power | Li-ion battery, USB-C for power and data, `ON/OFF` slide switch | — |

{{% alert title="Expansion connector pinout" color="danger" %}}
The board has an I²C expansion connector of the QWIIC type. We made a design mistake: the 3.3 V and the GND signals are swapped. Before you connect a QWIIC peripheral, make a corrected cable and use that.
{{% /alert %}}

## Display

The badge has a 1.54 inch tri-color e-paper display in black, red and white. The resolution is **152 × 152** pixels, and an SSD1675 or SSD1675B controller drives it. E-paper stays readable in bright sunlight at the camp, and it uses no power to hold an image. Both properties help the battery goal of one week.

The panel uses the waveform LUT in its own OTP memory by default. Advanced users can replace that waveform with a calibrated one, for example for a faster refresh. Copy a `LUT.CFG` file to the USB drive. See the firmware's [`LUT.md`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/LUT.md). You can make a waveform with the [ssd1675-calibration](https://codeberg.org/Ranzbak/ssd1675-calibration) tool. If you hold *Fire* during the start, the badge always uses the safe built-in waveform.

## Manual input

The Tamagotchi egg toy of the 1990s inspired the Cyber Ægg, so the buttons have the same names:

| Button | Function |
| ------ | -------- |
| **Select** | Moves through the menu options |
| **Execute** | Starts the option under the cursor |
| **Cancel** | Cancels the current operation |

The *Select* button is a 5-way joystick with a press action, which makes the navigation easier.

## Bluetooth

The nRF52840 provides Bluetooth Low Energy directly. It works in the 2.4 GHz band, and it uses an antenna on the PCB. That antenna comes from a Texas Instruments reference design in the standard KiCad 9 library. For the details, see the TI application note [SWRA228](https://www.ti.com/lit/an/swra228c/swra228c.pdf).

## LoRa

A dedicated Semtech **SX1262** radio provides the long-range connection. The matching and balun circuit follows the Semtech application note *AN1200.54*. The LoRa antenna is a Texas Instruments design, documented in [SWRA416](https://www.ti.com/lit/an/swra416/swra416.pdf). On the network side the badge speaks [MeshCore](https://meshcore.io/), so it joins the camp mesh immediately.

## NFC

The nRF52840 includes an NFC PHY. It drives a resonant circuit: a coil on the PCB of about 2.8 µH, with tuning capacitors. This tank circuit is matched to **13.56 MHz**. The nRF52840 supports **tag** functionality only, not reader mode. The firmware uses the tag for location games and station taps.

## Expansion connector

The board has an I²C expansion connector of the QWIIC type. We made a design mistake: the 3.3 V and the GND signals are swapped. Before you connect a QWIIC peripheral, make a corrected cable and use that.

{{% alert title="Fix the cable — cross the two power wires" color="warning" %}}
A standard QWIIC or JST-SH 4-pin cable carries **GND · 3V3 · SDA · SCL**. The badge swaps 3.3 V and GND, so a standard cable sends **reversed power** to your peripheral. Do not use one.

To make a corrected cable, swap the two power wires at **one end only**. Leave the other end standard, so that it still fits the peripheral.

1. At the badge end of the cable, lift the small locking tab of the JST-SH housing. Then pull the **GND** and the **3V3** contacts out carefully, with a fine pick or with tweezers.
2. Swap the two contacts. The wire from the GND slot goes into the 3V3 slot, and the wire from the 3V3 slot goes into the GND slot. The two data wires, SDA and SCL, stay in position.
3. Push both contacts back until they click, and make sure that nothing is loose.

The data lines do not change, so you move only the two power contacts. Mark the corrected cable, so that you do not use it as a standard one. As an alternative, cut the red (3V3) and the black (GND) wires and solder them crossed. You can also keep one cable for the badge only.
{{% /alert %}}

The connector on the badge should have been compatible with [QWIIC](https://www.sparkfun.com/qwiic). QWIIC is a standard I²C connector, used by many SparkFun breakout boards and by boards from other suppliers. The board has two 10 kΩ pull-up resistors. You can also enable the internal pull-ups of the nRF52840 when the bus capacitance is high.

The firmware can also drive an optional **Nicolai-Electronics I²C keyboard** on this bus, for names and mesh messages. Connect the keyboard with the corrected cable, and the text entry uses the physical keys. Shift and Alt are one-shot toggles, and the alt-symbol layer matches the silkscreen. Without a keyboard, the badge uses the joystick picker on the screen automatically.

## Power

A LiPo battery powers the badge, and USB-C charges it. An `ON/OFF` slide switch at the top left of the front disconnects the battery power. Slide the switch off and back on to power cycle the badge. The battery keeps the badge running when USB is disconnected, so this switch is the only way to restart it. Hold **Execute** while you switch the badge on to enter DFU mode for a firmware write.
