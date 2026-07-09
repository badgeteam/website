---
title: "Quick reference"
linkTitle: "Quick reference"
nodateline: true
weight: 2
---

A one-page cheat sheet for the Cyber Ægg. Print it and tuck it under the strap.

```
        ┌─────────────────────────────┐
        │      e-paper display        │
        ├─────────────────────────────┤
        │                             │
        │   [UP]                      │
        │ [L][F][R]      [CAN] [EXE]  │
        │   [DN]                      │
        │                             │
        └─────────────────────────────┘
            5-way joystick   2 buttons
            (F = press in)
```

## Buttons

| Button | Anywhere in the menu |
| ------ | -------------------- |
| **Execute** / Fire | Select · open · confirm |
| **Cancel** | Back · cancel · close |
| **Up / Down** | Move the cursor within a screen |
| **Left / Right** | Switch top-level screen |

## Top-level screens

Left / Right cycles through them:

`Game → Main → PMs → Channel → Adverts → Tokens → Clock → Calendar → Name → My QR`

## LED meanings

| Colour | Meaning |
| ------ | ------- |
| Pulsing orange | Boot — hardware init |
| Pulsing blue | Display + LoRa coming up (~13 s) |
| Single green flash | Boot done |
| Red flicker | Screen refreshing |
| Blue flicker | USB drive write |
| Blinking green | Contacts wipe in progress |
| One-shot red / green / blue | Someone pinged you over the mesh (`blinkme`) |

## Power-on combos

Hold these while connecting USB / resetting:

| Hold | Result |
| ---- | ------ |
| **Execute** | USB firmware update (DFU mode) |
| **Fire** (joystick press) | Force safe e-paper waveform (ignore a bad `LUT.CFG` for that boot) |
| **Execute + Cancel + Fire** | Factory reset (~40 s — wipes data and settings) |

If the app slot is blank the badge enters DFU on its own.

## USB drag-and-drop

Plug in USB-C — the badge mounts as the **`CYBR<4 hex>`** drive.

| File you drop | What it does |
| ------------- | ------------ |
| `ALARMS.ICS` | Imports alarms + calendar events |
| `030000.PCX` … `030009.PCX` | Sponsor slides |
| `<6 hex>.PCX` | Game sprite asset |
| `BORNPETS.CFG` | Custom pet balance (`KEY=VALUE`) |
| `LUT.CFG` | Custom e-paper waveform (advanced) |

Reboot the badge after dropping files.

## Firmware update (DFU)

```
dfu-util -d 1915:521f -D cyber-aegg.bin
```

Bootloader LEDs in DFU: red blink (idle) → solid blue (flashing) → solid green (done — power-cycle).

## Charging

USB-C in any port charges the badge. There is no separate charge LED — the battery icon on the watch / status bar shows the level. Unplug USB to re-enable Bluetooth pairing.
