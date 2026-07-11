---
title: "FAQ & troubleshooting"
linkTitle: "FAQ"
nodateline: true
weight: 8
---

Quick answers to the things people most often hit with the Cyber Ægg. If none of these help, file a bug (see the bottom of the page).

## General

**The badge won't wake / the display stays blank.**
Plug in USB-C. If the LED never blinks, hold **Execute** while plugging in and re-flash the firmware with `dfu-util` — see [Getting started → Firmware update](../getting-started/#firmware-update).

**A fresh flash (or factory reset) shows the factory test, then a "ready to ship" screen — and hangs there.**
By design. After an all-pass self-test the badge stamps its pass flag, draws the ship screen and halts (green LED pulsing). Power-cycle once more; the second boot skips the test and starts the app.

**"Battery voltage critical" screen at boot, the badge goes no further.**
The cell measured below 3.0 V at power-on, so the firmware halts to protect it. Charging is hardware-controlled and continues anyway — leave USB plugged in for a while, then power-cycle manually (the badge does not reboot itself off this screen).

**The clock keeps resetting on every reboot.**
Expected — there is no battery-backed RTC. Pair over Bluetooth with the MeshCore app once per boot, or wait until you are near a synced mesh repeater. Note that on-air time is only accepted from a **trusted source** — a signature-verified repeater / companion advert or a channel you hold the key for. A crowd of other badges won't set your clock; a phone pairing always will.

**Bluetooth isn't visible / I can't pair.**
Two things to check: USB is plugged in (Bluetooth is disabled whenever USB is connected — unplug), or Bluetooth was switched off in **Main → Settings → Bluetooth** (the toggle persists across reboots; set it back to `BLE: ON`).

**My alarm never fired.**
The clock hasn't been set yet this boot — alarms only fire once the time is known. If the clock *is* set, check the alarm's **Days** field — `None` never fires, and a Weekdays / Weekends / Custom mask only fires on matching days (the header bell shows for any enabled alarm regardless of its day mask).

**No mesh peers show up.**
Walk around — LoRa range varies with terrain and antenna orientation. Also check your LoRa preset under **Main → Settings → LoRa Radio**; it must match the rest of the local mesh. See [Mesh](../mesh/).

**I reformatted the badge's USB drive and everything is gone.**
Don't reformat. The badge only understands its own FAT12 layout; if boot finds anything else (exFAT, NTFS, odd sector sizes) it silently re-formats the whole partition — wiping every file. To clear files, delete them normally instead. If it already happened: copy your `.PCX` / `.ICS` / `.CFG` files back on and reboot.

**The charge bolt disappeared while USB is still plugged in.**
Charging is **complete** — the bolt returns by itself if the cell drains. Also, the battery icon can lag up to a minute behind reality; it is only re-sampled every 60 seconds.

**The red LED keeps flashing, especially on the BornPet screen.**
The LED does a short one-shot flash every time the e-paper repaints. Most screens are static so this is rare — but the pet has a slow idle animation, so the badge repaints (and flashes) every few seconds even when the frames look almost identical. It's not a fault and usually not an incoming message. Note the **Ignore blink** setting (under MeshCore) only mutes the flash for *incoming mesh messages* — it does not stop the per-repaint flash. To stop it, sit on a static screen.

**Which screen makes the battery last longest?**
The e-paper costs almost nothing to *hold* an image — the power goes into repaints. So the thriftiest screens are the ones that never repaint on their own: **My QR**, **Name**, **Tokens** and **Calendar** sit idle until you press a button. **Main** and **Watch** repaint once a minute for the clock; **BornPet** repaints every few seconds for its animation (most power). To stretch a charge, park on **My QR** or **Name** — idle, no flashing, and My QR is the handy one to leave up so people can scan you into the mesh.

## Display (e-paper)

**Red only shows up sometimes — e.g. after switching screens.**
Working as designed. Staying on one screen uses fast black/white refreshes that don't repaint the red plane; red repaints on a **full refresh** (a screen switch, or periodically). It isn't disabled — it just refreshes less often than black/white.

**The whole screen looks inverted (colours swapped) and stays that way.**
A full refresh briefly cycles the whole panel; if it gets cut short the image can latch inverted. Flip to another screen and back to force a clean redraw. Persistent inversion on the red-capable ("B") panels was a firmware bug — make sure you are on current firmware.

**No red at all / washed-out screen after adding a custom LUT.**
Your `LUT.CFG` is a fast waveform that skips red. Delete `LUT.CFG` from the badge's USB drive, or **hold *Fire* (joystick press) while booting** to force the built-in tri-colour waveform for that boot. See [Hardware → Display](../hardware/#display).

**Blinking white LED / won't finish booting after dropping a `LUT.CFG`.**
A bad or wrong-panel `LUT.CFG` is rejected automatically, but if the screen is unreadable, **hold *Fire* while booting** to force the safe built-in waveform, then delete or fix the file.

**The badge boots fine but ignores my `LUT.CFG`.**
Rejection is silent. Common causes: wrong `variant` letter for your panel, the wrong key copied from the calibration tool (it wants the flat `band_lut` hex field, not `stage_luts`), a file over ~2.8 KB (trim comments and unneeded band overrides), or bad hex length (each LUT value must be exactly 214 hex characters). Holding *Fire* at boot also forces the built-in waveform for that boot. Details in the firmware's [`LUT.md`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/LUT.md).

## Mesh / Bluetooth

**The MeshCore app says "connected" but nothing works — can't set the clock, no contacts, messages won't send.**
Stale pairing. The phone forgot the bond (you removed it in Bluetooth settings, or switched phones) but the badge still has it, so every command is rejected as unauthenticated. Fix: **Main → Settings → Bluetooth → Clear pairings** (wipes all bonds and reboots the badge), then pair fresh. The badge keeps at most **4** bonds — pairing a fifth phone silently doesn't stick.

**The Channel screen shows "BLE client connected" and the buttons are dead.**
By design: while the phone app is connected the on-badge channel browser locks (only Left / Right / Cancel work). Close or disconnect the app and the screen unlocks immediately.

**My PMs and the peers I'd heard are gone after a reboot.**
The PM inbox and the recently-heard list live in RAM only. **Saved contacts persist** — when you meet someone you want to message later, open their entry and save them before powering off.

## NFC

**My vanity URL / vCard doesn't stick.**
Write it with an NFC-writer app as a normal **URL/URI**, **vCard** or **Wi-Fi** record — anything you write (except a `token:`) becomes your broadcast profile and persists across reboots. See [NFC & tokens → Set your own broadcast data](../nfc/#set-your-own-broadcast-data).

**A token I received disappeared / a URL I tapped reverted.**
A `token:` write is intentionally transient — it lands on the **Tokens** screen (kept until reboot) and the broadcast reverts to your own profile after about 10 seconds. A pushed token can't overwrite your profile.

**A station tap did nothing — no toast, pet unaffected.**
Station commands only apply while you have an **active game**: pick a pet first (the egg countdown already counts), or start a new egg if your pet has left. Also: station commands come through the *signed* BadgeCtl reader — writing the phrase (e.g. `more food`) as a plain text record with a generic NFC app doesn't feed your pet; it just becomes your broadcast profile, and your badge now proudly hands out "more food" to every phone that taps it. Write a new URL / vCard to fix that.

## Game / BornPets

**The pet area shows "No sprites on flash".**
The boot scan found zero `.PCX` files — typical after a factory reset, a drive reformat, or a fresh flash without the asset set. Copy the sprite `.PCX` files back onto the `CYBR<hex>` drive and reboot.

**A sprite I made shows wrong colours / doesn't show at all.**
The badge needs a very specific PCX flavour: 2 bits-per-pixel, single plane, RLE, with the fixed palette order **0 = black, 1 = red, 2 = white, 3 = transparent** (the file's own palette is ignored). A normal 256-colour or 24-bit export is silently skipped. The [Pet Maker](https://scene.rs/pets/) and the firmware's asset tool get all of this right.

**`BORNPETS.CFG` / a mode change seems to have no effect.**
Both apply at **boot only** — eject the drive properly (so the file is flushed) and power-cycle. No `*` after the pet name = no override was applied. See [Games](../games/#custom-balance-bornpetscfg).

## Where to file bugs

Found something broken? Open an issue on the firmware repository:

<https://codeberg.org/Ranzbak/bornhack-firmware-2026/issues>
