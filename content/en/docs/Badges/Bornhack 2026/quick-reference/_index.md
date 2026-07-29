---
title: "Quick reference"
linkTitle: "Quick reference"
nodateline: true
weight: 2
---

This is a one-page cheat sheet for the Cyber Ægg. Print it and put it under the strap.

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

| Button | Function in the menu |
| ------ | -------------------- |
| **Execute** / Fire | Select · open · confirm |
| **Cancel** | Back · cancel · close |
| **Up / Down** | Move the cursor in a screen |
| **Left / Right** | Go to the next top-level screen |

## Top-level screens

Left and Right move through the screens:

`Game → Main → PMs → Channel → Adverts → Tokens → Clock → Calendar → Name → My QR`

## LED meanings

| Color | Meaning |
| ----- | ------- |
| Pulsing orange | Start — the hardware initializes |
| Pulsing blue | The display and LoRa start (about 13 s) |
| One green flash | The start is complete |
| Red flicker | The screen refreshes |
| Blue flicker | The badge writes to the USB drive |
| Blinking green | The badge erases the contacts |
| One red, green or blue flash | A person pinged you over the mesh (`blinkme`) |

## Power-on combos

Hold the button while you start the badge. Slide the **ON/OFF** switch at the top left of the front off, then back on. The battery keeps the badge running, so a disconnection of USB does not restart it.

| Hold | Result |
| ---- | ------ |
| **Execute** | USB firmware update (DFU mode) |
| **Fire** (joystick press) | Forces the safe e-paper waveform, and ignores a bad `LUT.CFG` for that start |
| **Execute + Cancel + Fire** | Factory reset (about 40 s — erases the data and the settings) |

If the application slot is empty, the badge enters DFU mode without a button.

## USB drag-and-drop

Connect USB-C. The badge mounts as the **`CYBR<4 hex>`** drive.

| File you put on the drive | What it does |
| ------------------------- | ------------ |
| `ALARMS.ICS` | Imports alarms and calendar events |
| `030000.PCX` … `030009.PCX` | Sponsor slides |
| `<6 hex>.PCX` | Game sprite asset |
| `PETS.CFG` | Adds or renames pets, with sprite PCX files |
| `BORNPETS.CFG` | Custom pet balance (`KEY=VALUE`) |
| `LUT.CFG` | Custom e-paper waveform (advanced) |

Restart the badge after you copy the files.

## Firmware update (DFU)

```
dfu-util -d 1915:521f -D cyber-aegg.bin
```

The bootloader LEDs in DFU mode are: a red blink for idle, solid blue during the write, solid green when the write is complete. Then power cycle the badge.

## Charging

USB-C in any port charges the badge. There is no separate charge LED. The battery icon on the watch face and in the status bar shows the level.
