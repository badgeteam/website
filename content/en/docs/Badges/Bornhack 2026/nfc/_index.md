---
title: "NFC & tokens"
linkTitle: "NFC & tokens"
nodateline: true
weight: 4
---

The back of the badge has an NFC antenna. Tap a phone or a station reader against it to interact — you don't have to do anything on the badge, it is always ready.

## Two things happen on a tap

### A phone reads the URL

Any standard NFC reader (the built-in Android reader, iOS) sees a `https://badge.team` URL containing your badge ID. Tapping with the OS reader simply opens that page in a browser. Harmless.

### BadgeCtl runs a station command

A phone running the **BadgeCtl** companion app, loaded with the matching event key, can send *signed* commands when held to the badge. These are used at event **stations**, where you boost your BornPet's stats:

| Command | Effect on your BornPet |
| ------- | ---------------------- |
| `more food` | Sets **hunger** to 0 |
| `more drugs` | Sets **sick** to 0 |
| `more inspiration` | Sets **drained** to 0 |
| `sleep like a bear` | Sets **tired** to 0 |

A short toast on the badge confirms what happened. Each command has a **5-minute cooldown** — tapping twice in quick succession does nothing the second time.

## Tokens

Tokens you collect from station taps (and from other badges) show up on the **Tokens** carousel screen — a running record of the stations you've visited during the camp.

## What the reader side needs

The badge is always ready; the *reader* needs:

* The **BadgeCtl** app installed.
* The matching Ed25519 private key bundled in — BornHack staff hold this for the official stations.

Third-party NFC reader apps can't issue these commands because they don't have the key; they only ever see the public URL.

## Running your own station

Want your own station? Rebuild the badge firmware with your **own** Ed25519 public key, then sign the matching commands with your private key in your reader app. The protocol spec, wire format and a signing recipe (Kotlin / Python / Rust) are in the firmware's [`NFC_README.md`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/NFC_README.md).

## How it works (hardware)

The nRF52840 includes an NFC tag PHY driving an on-PCB coil (~2.8 µH) tuned with capacitors to **13.56 MHz**. It supports **tag** mode only (not reader mode) — see the [Hardware](../hardware/#nfc) page.
