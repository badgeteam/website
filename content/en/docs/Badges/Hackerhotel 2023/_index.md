---
title: "Hackerhotel 2023"
nodateline: true
weight: -2023
---

The Hackerhotel 2023 badge, the **Anesidora Mk1**, is a puzzle badge built around
a **RP2040** microcontroller. The board is artwork first: the copper and the
soldermask draw a cracked stone tablet in lapis blue and gold, in the style of an
ancient grave marker, and the electronics sit in and around it.

The badge was the key to the puzzle hunt at the event. Clues were hidden in
binary on the lanyards and on markers around the hotel, and the badge itself
served a text adventure over its USB serial port. Attendees who solved
everything received a physical amulet.

## Hardware

 - RP2040 microcontroller
 - A row of buttons and LEDs along the bottom of the board, laid out as the data
   and address lines of a small computer
 - USB-C for power, serial and firmware updates
 - CR2032 coin cell for use away from a cable, selected with the BAT/USB switch
   on the top edge
 - Artwork in the copper and soldermask layers of the PCB itself

## Firmware

The firmware is written in MicroPython. Updates ship as a `.uf2` file, which the
RP2040 bootloader takes without any tools:

1. Download the `.uf2` from the
   [firmware update repository](https://github.com/AnesidoraCorporation/hh2023firmwareupdate).
2. Set the switch on the top of the badge to **USB** and connect it to your
   computer.
3. Hold **BOOTSEL**, press **RESET**, then release both.
4. Copy the `.uf2` file to the `RPI-RP2` drive that appears.
5. Wait for the copy to finish, then press **RESET**.

If the badge does not run on battery, the contacts of the battery clip are
usually the cause. The
[documentation repository](https://github.com/AnesidoraCorporation/hh2023documentation)
explains how to bend them back.

## Repositories

The badge was developed under the Anesidora Corporation organisation on GitHub:

 - [hh2023hardware](https://github.com/AnesidoraCorporation/hh2023hardware) — KiCad design files
 - [hh2023firmware](https://github.com/AnesidoraCorporation/hh2023firmware) — the badge firmware
 - [hh2023firmwareupdate](https://github.com/AnesidoraCorporation/hh2023firmwareupdate) — released `.uf2` updates
 - [hh2023documentation](https://github.com/AnesidoraCorporation/hh2023documentation) — visitor instructions, location markers and an FAQ

## More reading

 - [Hacker Hotel 2023 Had A Very Cool Badge](https://hackaday.com/2023/03/10/hacker-hotel-2023-had-a-very-cool-badge/) on Hackaday

## The team

 - Pim: Team lead, hardware and software development
 - Sake: Challenges
 - [Nikolett S.](https://ankhaneko.art): Artwork
