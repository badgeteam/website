---
title: "Getting started"
linkTitle: "Getting started"
nodateline: true
weight: 1
---

Welcome to the BornHack 2026 **Cyber Ægg** badge. This guide takes you from "unbox" to "actually playing with it" in a few minutes.

## First power-on

A fresh badge runs a built-in factory self-test on the very first boot. You will see a `FACTORY TEST` screen with a small PASS/FAIL grid, followed by `ALL PASS`. After that the badge goes straight to the application on every boot; the self-test never runs again unless the firmware is wiped.

The LED sequence at every boot is:

1. Pulsing **orange** — hardware initialisation
2. Pulsing **blue** — display and LoRa radio coming up (about 13 seconds)
3. A single **green** flash — ready

You then land on the **Main** screen.

## Controls

The badge has a 5-way joystick on the left and two thumb buttons on the right:

| Control | Action |
| ------- | ------ |
| **Execute** / joystick press (*Fire*) | Select / activate |
| **Cancel** | Back / dismiss |
| **Up / Down** | Move the cursor inside the current screen |
| **Left / Right** | Switch to the next top-level screen |

## Top-level screens

The interface is a carousel — **Left** / **Right** cycles through the top-level screens:

| Screen | What it is |
| ------ | ---------- |
| **Game** | BornPets — virtual pet, mini-games and hatchery |
| **Main** | Root menu: Bornagotchi · Settings · About |
| **PMs** | Private mesh messages inbox |
| **Channel** | Group / room mesh chat |
| **Adverts** | Recently heard mesh adverts |
| **Tokens** | Collected NFC tokens |
| **Clock** | Digital / analog watch face and alarm |
| **Calendar** | Month grid and per-day timeline |
| **Name** | Big conference-badge name view |
| **My QR** | Your mesh identity QR code to share with other badges |

## Pair with the MeshCore app

The badge speaks the [MeshCore](https://meshcore.io/) companion protocol over Bluetooth Low Energy. Install the **MeshCore** app on Android / iOS, or open <https://app.meshcore.nz/> in a browser that supports Web Bluetooth (Chrome / Edge on desktop or Android).

1. Power the badge with USB **unplugged** — Bluetooth is disabled while USB is connected.
2. In the app, scan for devices. Your badge advertises as **`Cyber Ægg XXYY`**, where `XXYY` is four hex characters unique to your badge.
3. The phone shows a passkey prompt and the badge shows a 6-digit passkey on its display. Type that number into the phone.
4. Once bonded, the app can set the clock, manage contacts, send and receive mesh messages, change the LoRa preset and more.

## Set the time

The badge has no battery-backed real-time clock, so the clock resets to "not set" on every reboot. There are two ways to set it:

* **MeshCore app** — connect over Bluetooth and the app pushes your phone's time to the badge.
* **Near a synced repeater** — a known-good mesh repeater advertises its time periodically and your badge picks it up automatically.

Set your timezone once under **Main → Settings → Timezone** — that setting persists.

## Charging

Plug any USB-C cable into the badge to charge it. Charge state is shown on the on-screen battery icon (there is no dedicated charge LED). Remember that Bluetooth is off while USB is connected, so unplug the badge when you want to pair.

## USB drag-and-drop

When plugged in over USB-C the badge appears as a small drive named **`CYBR<4 hex>`**. You can drop these files into its root:

| File | Effect |
| ---- | ------ |
| `ALARMS.ICS` | iCalendar file — imports alarms and calendar events |
| `030000.PCX` … `030009.PCX` | Sponsor slides shown on the splash carousel |
| `<6 hex>.PCX` | Game sprites |
| `BORNPETS.CFG` | Override the BornPets game balance |

Reboot the badge after copying files (re-plug USB) for the changes to take effect.

## Firmware update

Hold **Execute** while plugging in USB to enter the bootloader (DFU) mode — the LED blinks red. You can then flash a new firmware image with [`dfu-util`](https://dfu-util.sourceforge.net/):

```
dfu-util -d 1915:521f -D cyber-aegg.bin
```

The firmware is open source and built with Rust / Embassy — see [Ranzbak/bornhack-firmware-2026](https://codeberg.org/Ranzbak/bornhack-firmware-2026) for source, build instructions and pre-built images.
