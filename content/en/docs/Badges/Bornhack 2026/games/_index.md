---
title: "Games"
linkTitle: "Games"
nodateline: true
weight: 6
---

The **Game** screen runs **BornPets**, a virtual pet in the style of the Tamagotchi of the 1990s. It also holds a set of mini-games. You start the mini-games from the pet's *Play* menu.

## BornPets

Hatch a snail or a cat. Then keep the pet fed, healthy, rested and entertained.

### Hatching

The first time you open the Game screen, the badge shows the hatchery. Press **Execute / Fire** to start. Select a pet from the roster. The built-in pets are **Bartholomeus**, **Cat** and **Slug**. The egg then hatches in about one minute. After the hatching, give your pet a name of up to 12 characters, with the keyboard on the screen. The badge keeps the pet through a restart. You can rename the roster, and you can add your own pets. See [Custom pet roster](#custom-pet-roster-petscfg) below.

### Stats

Your pet has stats that increase with time. A high value is bad for the pet. Watch these stats:

| Stat | Fix with | Notes |
| ---- | -------- | ----- |
| **Hunger** | Feed | The pet gets hungry, and the other stats get worse |
| **Tired** | Rest or sleep | Use **Hibernate** for a long sleep |
| **Drained** | Play, or a mini-game | The pet has no inspiration. Play also clears "miserable" |
| **Sick** | Heal | Use this when the sick icon appears |
| **Miserable** | Play | The other stats then get worse faster, so correct this early |

The stats interact. When several stats are bad, the pet becomes miserable faster, and a miserable pet makes every other stat worse. Stay ahead of this spiral.

### Controls

| Key | Action |
| --- | ------ |
| Up / Down | Changes between the top row (the actions) and the bottom icon row |
| Left / Right | Moves along the current row |
| Execute / Fire | Activates the selected icon |
| Cancel | Goes back |

### Hibernate

Before you store the badge for more than a few hours, open the action menu and select **Hibernate**. The stats then freeze until you wake the pet. If you store the badge without hibernation, the stats continue to decay, and the pet can starve before you find the badge again.

### Game modes

There are two difficulty settings, under **Main → Bornagotchi → Mode**:

* **Classic.** The original balance of the badge.
* **Casual.** About half the decay speed, and more relief for each action. Use this if you do not want to care for the pet often.

The badge keeps the setting in flash. A `*` next to the mode name means that the change waits. **Restart the badge** to apply it.

### Turning the pet off

You can remove the pet. **Main → Bornagotchi → Disable Game** hides the whole Game screen from the carousel. The badge keeps this setting through a restart, and the label changes to *Enable Game*. While the game is off, an NFC station tap can no longer open the pet. Select *Enable Game* to get the pet screen back.

## Mini-games

Open the **Play** menu in the bottom row of BornPets and select a game. Each win lowers the *drained* stat, and it does not raise hunger. The games are therefore free entertainment. **Cancel** always leaves a mini-game.

| Game | Goal |
| ---- | ---- |
| **Tic-Tac-Toe** | Draw against the computer, or win (Normal or Impossible difficulty) |
| **Lights Out** | Switch a 5×5 grid until every light is off |
| **Nim** | Force the computer to take the last stick |
| **Maze** | Reach any border exit of an 18×18 maze |
| **Black Hole** | Beat the sum of the AI on a pyramid of 21 cells |
| **Triple Born** | A merge game in the style of *Triple Town*, on a 6×6 board |
| **BornJeweled** | An accessible match-3 game with a limit of 30 moves |

In a game, the **joystick** moves the cursor. **Execute / Fire** places or selects. **Cancel** returns to the Play menu.

## Make your own pet

You can build a companion that is not a snail or a cat. The **CyberÆgg Pet Maker** is a sprite and animation editor for BornPets, and it runs in the browser:

**[scene.rs/pets/](https://scene.rs/pets/)**

With the Pet Maker you can:

* Start from a preset (**Bartholomeus**, **Cat** or **Slug**), or from a **Blank** canvas.
* Draw each animation frame with the badge's palette: **black**, **red**, **white** and transparent. White is the e-paper background, and transparent means that the badge draws nothing.
* Preview the animation states, for example *Idle*, with controls for the speed and the onion skin.
* Change the game balance (`BORNPETS.CFG`), which sets how fast the stats decay and recover.
* Select **Download ZIP** to get all the files for the badge.

### Installing a custom pet

The badge shows a USB drive when you connect USB-C. See [Getting started](../getting-started/#usb-drag-and-drop). Unpack the export of the Pet Maker. Copy the sprite files to the root of the `CYBR<4 hex>` drive, together with `PETS.CFG` and, if you made one, `BORNPETS.CFG`. Then restart the badge.

### Hand-editing sprites (GIMP etc.)

The badge accepts one specific PCX format: 2 bits per pixel, one plane, RLE. Editors such as GIMP export a PCX with 16 or 256 colors instead, and the badge skips those files without a message. The firmware's [`scripts/`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/scripts) folder has helpers for this problem:

* [`fix_badge_pcx.py`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/scripts/fix_badge_pcx.py) writes a PCX with the wrong depth, for example a 4 bpp or 8 bpp GIMP export, back to the badge's 2 bpp format. It keeps the dimensions.
* [`png_to_badge_pcx.py`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/scripts/png_to_badge_pcx.py) converts a PNG directly to a 152×152 badge PCX.
* [`check_badge_pcx.py`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/scripts/check_badge_pcx.py) checks a file before you copy it. You then find a bad export on your computer, not on the badge.

## Custom pet roster: `PETS.CFG`

`PETS.CFG` is the pet roster in the "Choose your Pet" screen. It is a plain-text file with one `PREFIX=NAME` on each line. You can edit it without a new firmware:

```
# --- current pets (rename if you like) ---
0=Bartholomeus
1=Cat
2=Slug

# --- add your own (needs 05xxxx.PCX / 06xxxx.PCX sprites) ---
5=Dragon
6=Ghost
```

* **PREFIX** is the sprite-prefix byte of the pet, in decimal:
  * `0`, `1`, `2` are the built-in pets. A line for one of these renames it.
  * `3`, `4` are reserved for sponsors and menu icons, and the badge ignores them.
  * `5` to `7` are your own pets.
* **NAME** is up to 16 ASCII characters.

The sprites of a pet are the `PPAAFF.PCX` files on the badge. `PP` is the prefix, `AA` is the animation part, and `FF` is the frame. The firmware counts the PCX files that are present, for example `050100` to `050104` for five idle frames. There is therefore no fixed frame count and no header to maintain. Export the sprites at the prefix of the pet from the [Pet Maker](https://scene.rs/pets/), and copy them to the drive next to `PETS.CFG`. The firmware ignores lines that start with `#`, and reserved or damaged lines.

## Custom balance: `BORNPETS.CFG`

To change only the difficulty, and not the sprites, copy a plain-text `BORNPETS.CFG` file to the root of the badge's USB drive. Write one `KEY=VALUE` on each line:

```
# speed up hunger decay, slow down the drained stat
HUNGER_RATE=4
DRAINED_INTERVAL=180
```

Eject the drive and restart the badge. While a configuration is active, a small `*` appears after the name of the pet. To return to a preset, delete the file and restart the badge. The Pet Maker can write this file for you. The firmware's [`USER_GAMES.md`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/USER_GAMES.md) documents every key and its range.

Three points are important:

* **Changes take effect at the start only.** Eject the drive correctly, so that the computer writes the data. Then power cycle the badge. If no `*` follows the name of the pet, the badge applied no override.
* **The parser is silent.** It skips an unknown key. It also drops the whole line for a value that is not a plain whole number, so no units, no decimals and no minus sign. It shows no error on the screen.
* **The documented "reasonable range" is advice, not a limit.** The firmware limits a value only to the range of the integer type. `HUNGER_RATE=1000` really fills hunger about 300 times faster, and your pet starves before you disconnect the cable. If a large value damaged your pet, delete the file and restart the badge to return to the preset.
