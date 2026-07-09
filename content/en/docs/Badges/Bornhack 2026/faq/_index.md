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

**The clock keeps resetting on every reboot.**
Expected — there is no battery-backed RTC. Pair over Bluetooth with the MeshCore app once per boot, or wait until you are near a synced mesh repeater that advertises the time. See [Getting started → Set the time](../getting-started/#set-the-time).

**Bluetooth isn't visible / I can't pair.**
Bluetooth is disabled whenever USB is connected. **Unplug the badge** and try again.

**My alarm never fired.**
The clock hasn't been set yet this boot — alarms only fire once the time is known. Set the time first.

**No mesh peers show up.**
Walk around — LoRa range varies with terrain and antenna orientation. Also check your LoRa preset under **Main → Settings → LoRa Radio**; it must match the rest of the local mesh. See [Mesh](../mesh/).

## Display (e-paper)

**Red only shows up sometimes — e.g. after switching screens.**
Working as designed. Staying on one screen uses fast black/white refreshes that don't repaint the red plane; red repaints on a **full refresh** (a screen switch, or periodically). It isn't disabled — it just refreshes less often than black/white.

**No red at all / washed-out screen after adding a custom LUT.**
Your `LUT.CFG` is a fast waveform that skips red. Delete `LUT.CFG` from the badge's USB drive, or **hold *Fire* (joystick press) while booting** to force the built-in tri-colour waveform for that boot. See [Hardware → Display](../hardware/#display).

**Blinking white LED / won't finish booting after dropping a `LUT.CFG`.**
A bad or wrong-panel `LUT.CFG` is rejected automatically, but if the screen is unreadable, **hold *Fire* while booting** to force the safe built-in waveform, then delete or fix the file.

## NFC

**My vanity URL / vCard doesn't stick.**
Write it with an NFC-writer app as a normal **URL/URI**, **vCard** or **Wi-Fi** record — anything you write (except a `token:`) becomes your broadcast profile and persists across reboots. See [NFC & tokens → Set your own broadcast data](../nfc/#set-your-own-broadcast-data).

**A token I received disappeared / a URL I tapped reverted.**
A `token:` write is intentionally transient — it lands on the **Tokens** screen (kept until reboot) and the broadcast reverts to your own profile after about 10 seconds. A pushed token can't overwrite your profile.

## Where to file bugs

Found something broken? Open an issue on the firmware repository:

<https://codeberg.org/Ranzbak/bornhack-firmware-2026/issues>
