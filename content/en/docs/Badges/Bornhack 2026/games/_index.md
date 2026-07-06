---
title: "Games"
linkTitle: "Games"
nodateline: true
weight: 6
---

The **Game** screen runs **BornPets** — a virtual pet inspired by the 90's Tamagotchi — plus a set of mini-games you launch from the pet's *Play* menu.

## BornPets

Hatch a snail or a cat, then keep it fed, healthy, rested and entertained.

### Hatching

The first time you open the Game screen you see the hatchery. Push **Execute / Fire** to start, pick a pet from the roster (the built-ins are **Bartholomeus**, **Cat** and **Slug**), then wait about a minute for the egg to hatch. After hatching you name your pet — up to 12 characters via the on-screen keyboard. The save persists across reboots. You can rename the roster or add your own pets — see [Custom pet roster](#custom-pet-roster-petscfg) below.

### Stats

Your pet has decaying stats — the higher they get, the worse off the pet is. Watch out for:

| Stat | Fix with | Notes |
| ---- | -------- | ----- |
| **Hunger** | Feed | The pet gets hungry and other stats worsen |
| **Tired** | Rest / sleep | Or **Hibernate** for long sleeps |
| **Drained** | Play or a mini-game | Lack of inspiration — also resets "miserable" |
| **Sick** | Heal | Use when the sick icon appears |
| **Miserable** | Play | Makes the other stats decay faster, so treat it early |

Stats interact: when several stats are bad the pet becomes miserable faster, and miserable makes everything else worse. Stay ahead of the spiral.

### Controls

| Key | Action |
| --- | ------ |
| Up / Down | Switch between the top (actions) and bottom icon rows |
| Left / Right | Move along the current row |
| Execute / Fire | Activate the highlighted icon |
| Cancel | Back out |

### Hibernate

Putting the badge away for more than a few hours? Open the action menu and choose **Hibernate** — stats freeze until you wake the pet. Forget to hibernate before storing the badge and the pet keeps decaying, so it may have starved by the time you find it again.

### Game modes

Two difficulty presets, picked via **Main → Bornagotchi → Mode**:

* **Classic** — the original balance the badge ships with.
* **Casual** — roughly half the decay speed and more relief per action, for people who don't want to baby-sit.

The setting persists in flash. A `*` next to the mode name means the change is queued — **reboot the badge** for it to take effect.

## Mini-games

Open the bottom-row **Play** menu in BornPets and pick a game. Each win reduces the *drained* stat without raising hunger, so they are free entertainment. **Cancel** always exits a mini-game.

| Game | Goal |
| ---- | ---- |
| **Tic-Tac-Toe** | Draw or beat the computer (Normal or Impossible difficulty) |
| **Lights Out** | Toggle a 5×5 grid until every light is off |
| **Nim** | Force the computer to take the last stick |
| **Maze** | Reach any border exit of an 18×18 maze |
| **Black Hole** | Beat the AI's adjacent-sum on a 21-cell pyramid |
| **Triple Born** | A *Triple Town* style merge game on a 6×6 board |
| **BornJeweled** | Accessible match-3 with a 30-move limit |

Inside a game: the **joystick** moves the cursor, **Execute / Fire** places or selects, and **Cancel** quits back to the Play menu.

## Make your own pet

Want a companion that isn't a snail or a cat? The **CyberÆgg Pet Maker** is a browser-based sprite and animation editor for BornPets:

**[scene.rs/pets/](https://scene.rs/pets/)**

With it you can:

* Start from a preset (**Bartholomeus**, **Cat**, **Slug**) or a **Blank** canvas.
* Draw each animation frame with the badge's palette — **black**, **red**, **white** and transparent (white is the e-paper background; transparent means "not drawn").
* Preview animation states (e.g. *Idle*) with speed and onion-skin controls.
* Optionally tune the game balance (`BORNPETS.CFG`) — how fast stats decay and recover.
* **Download ZIP** to get everything packaged for the badge.

### Installing a custom pet

The badge exposes a USB drive when plugged in over USB-C (see [Getting started](../getting-started/#usb-drag-and-drop)). Unzip the export from the Pet Maker and copy the sprite files — plus `PETS.CFG`, and `BORNPETS.CFG` if you made one — into the root of the `CYBR<4 hex>` drive, then reboot the badge.

## Custom pet roster: `PETS.CFG`

`PETS.CFG` is the pet roster shown in "Choose your Pet". It is a plain-text file with one `PREFIX=NAME` per line, editable without reflashing the firmware:

```
# --- current pets (rename if you like) ---
0=Bartholomeus
1=Cat
2=Slug

# --- add your own (needs 05xxxx.PCX / 06xxxx.PCX sprites) ---
5=Dragon
6=Ghost
```

* **PREFIX** is the pet's sprite-prefix byte (decimal):
  * `0`, `1`, `2` — the built-in pets (listing them just renames them)
  * `3`, `4` — reserved (sponsors, menu icons) and ignored
  * `5`–`7` — your own custom pets
* **NAME** is up to 16 ASCII characters.

A pet's sprites are the matching `PPAAFF.PCX` files on the badge — `PP` is the prefix, `AA` the animation part, `FF` the frame. The firmware just counts the PCX files present (for example `050100`…`050104` = five idle frames), so there is no fixed frame count or header to maintain. Export sprites at the pet's prefix from the [Pet Maker](https://scene.rs/pets/) and drop them next to `PETS.CFG` on the drive. Lines beginning with `#`, and reserved or malformed rows, are ignored.

## Custom balance: `BORNPETS.CFG`

If you only want to change the difficulty (not the sprites), drop a plain-text `BORNPETS.CFG` in the root of the badge's USB drive with one `KEY=VALUE` per line:

```
# speed up hunger decay, slow down the drained stat
HUNGER_RATE=4
DRAINED_INTERVAL=180
```

Eject the drive and reboot. When a config is active a small `*` appears after the pet's name. Delete the file and reboot to return to a preset. The Pet Maker can generate this file for you, and the firmware's [`USER_GAMES.md`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/USER_GAMES.md) documents every supported key and its range.
