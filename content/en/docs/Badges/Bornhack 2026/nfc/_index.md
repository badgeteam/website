---
title: "NFC & tokens"
linkTitle: "NFC & tokens"
nodateline: true
weight: 4
---

The back of the badge has an NFC antenna. Touch a phone or a station reader against it to interact. You do nothing on the badge, because it is always ready.

## Two things happen on a tap

### A phone reads your broadcast profile

Any standard NFC reader, such as the built-in reader of Android or iOS, sees your **broadcast profile**. The default profile is the badge's own documentation page, `https://badge.team/docs/badges/bornhack-2026/`. You can replace it with your own vanity URL, a vCard or another record. See [Set your own broadcast data](#set-your-own-broadcast-data). A tap with the reader of the operating system only reads the profile. It is harmless.

### BadgeCtl runs a station command

A phone with the **BadgeCtl** companion app and the correct event key sends *signed* commands to the badge. The event **stations** use these commands, and they improve the statistics of your BornPet:

| Command | Effect on your BornPet |
| ------- | ---------------------- |
| `more food` | Sets **hunger** to 0 |
| `more drugs` | Sets **sick** to 0 |
| `more inspiration` | Sets **drained** to 0 |
| `sleep like a bear` | Sets **tired** to 0 |

A short message on the badge confirms the result. Each command has a **cooldown of 5 minutes**. A second tap in that period does nothing.

Station commands need an **active game**. Select a pet first. The egg countdown counts as an active game. If your pet left, start a new egg. The badge ignores a tap when no pet is active.

## Tokens

Tokens from station taps and from other badges go to the **Tokens** screen in the carousel. The badge collects **many** tokens and keeps them until the next start. The list is a record of the stations and the badges you tapped during the camp.

When a person pushes a `token:` to your badge, the badge shows it for about **10 seconds**. The badge then broadcasts your own profile again. A pushed token cannot replace your profile.

## Set your own broadcast data

The default documentation URL is not permanent. The badge can broadcast **any record you like**. Use an NFC writer app on your phone, such as *NFC Tools*, and write to the back of the badge:

* **Vanity URL.** Write a URL or URI record, for example `annejan.com`. A **Text** record `set:https://your.link` also works, for writer apps that write text only.
* **vCard.** Write a Contact or vCard record. Phones that tap your badge then get your contact card.
* **Wi-Fi**, or any other record. The badge serves it without a change.

The rule is simple. The badge keeps what you write, and the record survives a restart. The one exception is a `token:` record, which goes to your Tokens screen instead. Keep the record short. The limit is about 127 bytes, which is enough for a URL or a small vCard. The badge also cuts a long URL in the `set:` text form to about 118 characters after the scheme. For a longer URL, write a plain URI record, or use a link shortener.

NFC has no erase function that returns the factory default. An empty write, or the "format tag" function of a writer app, does not restore the built-in documentation URL. It keeps your current profile, or it stores the empty record. To change the broadcast, write the new record over the old one.

This function is **unauthenticated**. Any person who touches your badge with a writer app can change the record. The badge is in your pocket, so control physical access to it.

## What the reader side needs

The badge is always ready. The *reader* needs two things:

* The **BadgeCtl** app.
* The correct Ed25519 private key in the app. BornHack staff hold this key for the official stations.

Other NFC reader apps cannot send these commands, because they do not have the key. They see only the public URL.

## Running your own station

You can run your own station. Build the badge firmware again with your **own** Ed25519 public key. Then sign the commands with your private key in your reader app. The protocol specification, the wire format and a signing recipe in Kotlin, Python and Rust are in the firmware's [`NFC_README.md`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/NFC_README.md).

## How it works (hardware)

The nRF52840 includes an NFC tag PHY. It drives a coil on the PCB of about 2.8 µH, tuned with capacitors to **13.56 MHz**. The PHY supports **tag** mode only, not reader mode. See the [Hardware](../hardware/#nfc) page.
