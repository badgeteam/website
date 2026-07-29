---
title: "Getting started"
linkTitle: "Getting started"
nodateline: true
weight: 1
---

This guide takes you from the unboxing of the BornHack 2026 **Cyber Ægg** badge to the first use. It takes a few minutes.

## First power-on

A new badge runs a factory self-test on the first start. The badge shows a `FACTORY TEST` screen with a small PASS/FAIL grid, and then `ALL PASS`. After that, the badge starts the application directly at every start. The self-test does not run again, unless you erase the firmware.

The first start then plays a sponsor slideshow. It shows the event logos and then the badge-sponsor logos, a few seconds each. The slideshow plays only once. To see it again, select **Main → Badge sponsors**.

The LED sequence at every start is:

1. Pulsing **orange** — the hardware initializes
2. Pulsing **blue** — the display and the LoRa radio start (about 13 seconds)
3. One **green** flash — the badge is ready

The badge then shows the **Main** screen.

## Controls

The badge has a 5-way joystick on the left and two thumb buttons on the right:

| Control | Action |
| ------- | ------ |
| **Execute** / joystick press (*Fire*) | Select or activate |
| **Cancel** | Go back or dismiss |
| **Up / Down** | Move the cursor in the current screen |
| **Left / Right** | Go to the next top-level screen |

## Top-level screens

The interface is a carousel. **Left** and **Right** move through the top-level screens:

| Screen | What it is |
| ------ | ---------- |
| **Game** | BornPets — the virtual pet, the mini-games and the hatchery |
| **Main** | Root menu: Bornagotchi · Settings · About · Badge sponsors |
| **PMs** | Inbox for private mesh messages |
| **Channel** | Group or room mesh chat |
| **Adverts** | Mesh adverts the badge heard recently |
| **Tokens** | The NFC tokens you collected |
| **Clock** | Digital or analog watch face, and the alarm |
| **Calendar** | Month grid and the timeline for each day |
| **Name** | Large conference-badge name view |
| **My QR** | Your mesh identity as a QR code, to share with other badges |

## Pair with the MeshCore app

The badge speaks the [MeshCore](https://meshcore.io/) companion protocol over Bluetooth Low Energy. Install the **MeshCore** app on Android or iOS. You can also open <https://app.meshcore.nz/> in a browser with Web Bluetooth, such as Chrome or Edge on desktop or on Android.

1. Make sure that Bluetooth is on. **Main → Settings → Bluetooth** must show `BLE: ON`.
2. Scan for devices in the app. The badge advertises as **`Cyber Ægg XXYY`**. `XXYY` is four hex characters, unique to your badge.
3. The phone shows a passkey prompt, and the badge shows a 6-digit passkey on its display. Type that number into the phone.
4. After the bond, the app can set the clock, manage contacts, send and receive mesh messages, and change the LoRa preset.

## Set the time

The badge has no real-time clock with a backup battery. The clock therefore returns to "not set" at every start. You can set it in two ways:

* **With the MeshCore app.** Connect over Bluetooth, and the app sends the time of your phone to the badge.
* **Near a synchronized repeater.** A known-good mesh repeater advertises its time regularly, and your badge takes it automatically.

Set your timezone once, under **Main → Settings → Timezone**. The badge keeps that setting.

## Charging

Connect any USB-C cable to the badge to charge it. The battery icon on the screen shows the charge state. There is no separate charge LED.

Two effects look like faults, but they are correct. If the charge symbol disappears while USB stays connected, the charge is **complete**. The symbol comes back when the cell drains. The battery icon can also be up to a minute behind, because the badge measures the battery only every 60 seconds.

## USB drag-and-drop

When you connect USB-C, the badge appears as a small drive with the name **`CYBR<4 hex>`**. You can put these files in its root:

| File | Effect |
| ---- | ------ |
| `ALARMS.ICS` | iCalendar file — imports alarms and calendar events |
| `030000.PCX` … `030009.PCX` | Sponsor slides for the splash carousel |
| `<6 hex>.PCX` | Game sprites |
| `PETS.CFG` | Adds or renames pets, with their sprite PCX files — see [Games](../games/#custom-pet-roster-petscfg) |
| `BORNPETS.CFG` | Replaces the BornPets game balance |
| `LUT.CFG` | Custom e-paper waveform (advanced — a calibrated display LUT) |

After you copy files, restart the badge with a new connection of the USB cable. The changes then take effect.

`LUT.CFG` is an advanced change. It replaces the built-in display waveform of the panel with a calibrated one, for example for a faster refresh. If a custom LUT gives a bad image, hold ***Fire*** (the joystick press) during the start. The badge then uses the safe built-in waveform for that start. Delete the file, or correct it. The badge rejects a damaged `LUT.CFG`, or one for a different panel, automatically.

## Firmware update

The [Flash page](../flash/) is the easiest method. It writes the firmware and the badge's asset files from a Chromium-family browser. You install no toolchain.

To do it by hand, enter the bootloader (DFU) mode first. Slide the **ON/OFF** switch at the top left of the front off, then back on, while you hold **Execute**. The LED then blinks red. The battery keeps the badge running, so a disconnection of USB does not restart it. You can then write a new firmware image with [`dfu-util`](https://dfu-util.sourceforge.net/):

```
dfu-util -d 1915:521f -D cyber-aegg.bin
```

The firmware is open source, and we build it with Rust and Embassy. See [Ranzbak/bornhack-firmware-2026](https://codeberg.org/Ranzbak/bornhack-firmware-2026) for the source, the build instructions and prebuilt images.
