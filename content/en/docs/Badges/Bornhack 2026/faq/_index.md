---
title: "FAQ & troubleshooting"
linkTitle: "FAQ"
nodateline: true
weight: 8
---

These are the answers to the questions people ask most often about the Cyber Ægg. If no answer helps, report a bug. The bottom of this page tells you where.

## General

**The badge does not wake up, and the display stays empty.**
Connect USB-C. If the LED does not blink, hold **Execute** while you connect the cable, and write the firmware again with `dfu-util`. See [Getting started → Firmware update](../getting-started/#firmware-update).

**After a firmware write or a factory reset, the badge shows the factory test, then a "ready to ship" screen, and it stops there.**
This is correct behavior. After a self-test with all tests passed, the badge sets its pass flag, draws the ship screen and stops. The green LED pulses. Power cycle the badge once more. The second start skips the test and runs the application.

**The badge shows "Battery voltage critical" at the start, and it goes no further.**
The cell measured less than 3.0 V at the start, so the firmware stops to protect the cell. The hardware controls the charge, and it continues. Leave USB connected for some time, then power cycle the badge by hand. The badge does not restart itself from this screen.

**The clock resets at every start.**
This is expected, because the badge has no RTC with a backup battery. Pair the badge over Bluetooth with the MeshCore app once per start, or stay near a synchronized mesh repeater. The badge accepts a time over the air only from a **trusted source**. That is a repeater or companion advert with a verified signature, or a channel that you hold the key for. Other badges near you cannot set your clock. A pairing with a phone always sets it.

**Bluetooth is not visible, and I cannot pair.**
Make sure that Bluetooth is on, under **Main → Settings → Bluetooth**. The badge keeps this setting through a restart, so set it to `BLE: ON`.

**My alarm did not sound.**
The clock is not set for this start, and an alarm sounds only when the time is known. If the clock *is* set, look at the **Days** field of the alarm. `None` never sounds. A Weekdays, Weekends or Custom mask sounds on the selected days only. The bell in the header appears for every alarm that is on, whatever its day mask is.

**No mesh peers appear.**
Walk around. The LoRa range changes with the terrain and with the orientation of the antenna. Also check your LoRa preset, under **Main → Settings → LoRa Radio**. It must be the same as on the rest of the local mesh. See [Mesh](../mesh/).

**I formatted the badge's USB drive, and all files are gone.**
Do not format the drive. The badge understands only its own FAT12 layout. If the start finds another layout, such as exFAT, NTFS or unusual sector sizes, the badge formats the whole partition again and erases every file. It gives no message. To remove files, delete them in the normal way. If the badge already formatted the drive, copy your `.PCX`, `.ICS` and `.CFG` files back and restart it.

**The charge symbol disappeared while USB is connected.**
The charge is **complete**. The symbol comes back when the cell drains. The battery icon can also be up to a minute behind, because the badge measures the battery only every 60 seconds.

**The red LED flashes often, most of all on the BornPet screen.**
The LED gives one short flash every time the e-paper repaints. Most screens are static, so the flash is rare there. The pet has a slow idle animation, so the badge repaints, and flashes, every few seconds. The frames look almost equal, but each one is a repaint. This is not a fault, and it is usually not an incoming message. The **Ignore blink** setting, under MeshCore, mutes the flash for *incoming mesh messages* only. It does not stop the flash for a repaint. To stop the flash, stay on a static screen.

**Which screen gives the longest battery life?**
The e-paper uses almost no power to *hold* an image. The power goes into the repaints. The most economical screens therefore never repaint by themselves: **My QR**, **Name**, **Tokens** and **Calendar** stay idle until you press a button. **Main** and **Watch** repaint once a minute for the clock. **BornPet** repaints every few seconds for its animation, and it uses the most power. To make a charge last, stay on **My QR** or on **Name**. Both are idle and do not flash. My QR is also useful, because other people can scan you into the mesh.

## Display (e-paper)

**Red appears only sometimes, for example after a change of screen.**
This is correct behavior. On one screen the badge uses fast black and white refreshes, which do not repaint the red plane. Red repaints on a **full refresh**, at a change of screen or at regular intervals. Red is not off. It refreshes less often than black and white.

**The whole screen is inverted, and it stays inverted.**
A full refresh cycles the whole panel for a short time. If that cycle stops early, the image can stay inverted. Go to another screen and back to force a clean redraw. A permanent inversion on the red-capable "B" panels was a firmware bug, so make sure that you use the current firmware.

**There is no red, or the screen is washed out, after I added a custom LUT.**
Your `LUT.CFG` is a fast waveform without red. Delete `LUT.CFG` from the badge's USB drive. You can also hold ***Fire*** (the joystick press) during the start, which forces the built-in tri-color waveform for that start. See [Hardware → Display](../hardware/#display).

**The white LED blinks, and the badge does not finish the start, after I copied a `LUT.CFG`.**
The badge rejects a damaged `LUT.CFG`, or one for a different panel, automatically. If the screen is unreadable, hold ***Fire*** during the start to force the safe built-in waveform. Then delete the file, or correct it.

**The badge starts correctly, but it ignores my `LUT.CFG`.**
The badge rejects the file without a message. The usual causes are a wrong `variant` letter for your panel, or the wrong key from the [ssd1675-calibration](https://codeberg.org/Ranzbak/ssd1675-calibration) tool. The badge wants the flat `band_lut` hex field, not `stage_luts`. A wrong hex length is also a cause, because each LUT value must be exactly 214 hex characters. The file size is *not* a limit. The badge streams the file from flash, so a full 16-band export of about 3.7 KB, with all comments, loads correctly. If you hold *Fire* at the start, the badge uses the built-in waveform for that start. The firmware's [`LUT.md`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/LUT.md) has the details.

## Mesh / Bluetooth

**The MeshCore app reports "connected", but nothing works. I cannot set the clock, I see no contacts, and messages do not go out.**
The pairing is stale. The phone removed the bond, because you deleted it in the Bluetooth settings or changed phones, and the badge still has it. The badge therefore rejects every command as unauthenticated. To correct this, select **Main → Settings → Bluetooth → Clear pairings**. That erases all bonds and restarts the badge. Then pair again. The badge holds a maximum of **4** bonds. A fifth phone does not stay, and the badge gives no message.

**The Channel screen shows "BLE client connected", and the buttons do nothing.**
This is correct behavior. While the phone app is connected, the channel browser on the badge locks, and only Left, Right and Cancel work. Close the app or disconnect it, and the screen unlocks immediately.

**My PMs and the peers I heard are gone after a restart.**
The PM inbox and the list of recently-heard peers are in RAM only. **The badge keeps saved contacts.** When you meet a person you want to message later, open their entry and save them before you switch the badge off.

## NFC

**My vanity URL or vCard does not stay.**
Write it with an NFC writer app, as a normal **URL/URI**, **vCard** or **Wi-Fi** record. Every record you write becomes your broadcast profile and survives a restart. The one exception is a `token:` record. See [NFC & tokens → Set your own broadcast data](../nfc/#set-your-own-broadcast-data).

**A token I received disappeared, or a URL I tapped came back.**
A `token:` write is temporary on purpose. The token goes to the **Tokens** screen, where the badge keeps it until the next restart. The broadcast returns to your own profile after about 10 seconds. A pushed token cannot replace your profile.

**A station tap did nothing. There was no message, and the pet did not change.**
Station commands work only with an **active game**. Select a pet first, and note that the egg countdown counts as active. If your pet left, start a new egg. Station commands also come through the *signed* BadgeCtl reader. If you write the phrase, for example `more food`, as a plain text record with a general NFC app, it does not feed your pet. It becomes your broadcast profile, and your badge then gives "more food" to every phone that taps it. Write a new URL or vCard to correct this.

## Game / BornPets

**The pet area shows "No sprites on flash".**
The scan at the start found no `.PCX` files. This happens after a factory reset, after a format of the drive, or after a firmware write without the asset set. Copy the sprite `.PCX` files back to the `CYBR<hex>` drive and restart the badge.

**A sprite I made has the wrong colors, or it does not appear.**
The badge needs one specific PCX format: 2 bits per pixel, one plane, RLE. The palette order is fixed: **0 = black, 1 = red, 2 = white, 3 = transparent**. The badge ignores the palette in the file. It skips a normal 256-color or 24-bit export without a message. The [Pet Maker](https://scene.rs/pets/) and the firmware's asset tool write the correct format. If you edited a sprite by hand in GIMP, write it again with the firmware's [`scripts/fix_badge_pcx.py`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/scripts/fix_badge_pcx.py), or check it first with `check_badge_pcx.py`. See [Games → Hand-editing sprites](../games/#hand-editing-sprites-gimp-etc).

**`BORNPETS.CFG`, or a change of mode, has no effect.**
Both take effect at the **start** only. Eject the drive correctly, so that the computer writes the file, and power cycle the badge. If no `*` follows the name of the pet, the badge applied no override. See [Games](../games/#custom-balance-bornpetscfg).

## Where to file bugs

If you find a fault, open an issue on the firmware repository:

<https://codeberg.org/Ranzbak/bornhack-firmware-2026/issues>
