---
title: "Mesh & messaging"
linkTitle: "Mesh & messaging"
nodateline: true
weight: 3
---

The badge has a LoRa SX1262 radio and speaks the **[MeshCore](https://meshcore.co.uk/)** mesh protocol. Other badges, MeshCore phones and standalone repeaters all appear as peers. Four carousel screens are mesh-related: **PMs**, **Channel**, **Adverts** and **My QR**, backed by the **Contacts** list.

## Getting on the same network

Three things must match across every badge in the local mesh:

1. **LoRa preset** — frequency, bandwidth and spreading factor. The default is **BornHack 2026** (baked into the firmware). Change it under **Main → Settings → LoRa Radio**.
2. **Public channel key** — shared automatically via the preset.
3. **Antenna** — make sure the LoRa antenna is connected.

If you can't see anyone else's adverts after a minute, check the preset first.

## Adverts

Every badge, phone or repeater on the mesh periodically broadcasts an **advert** — its public name, identity hash and capabilities. Your badge logs these on the **Adverts** screen as they arrive.

| Key | Action |
| --- | ------ |
| Up / Down | Scroll the advert list |
| Execute / Fire | Save the highlighted advert as a contact |
| Cancel | Back |
| Left / Right | Next carousel screen |

## Private messages (PMs)

The **PMs** screen is your private inbox — each row is a peer who has messaged you.

| Marker | Meaning |
| ------ | ------- |
| `●` | Heard from less than 5 minutes ago |
| `*` | Favourite |
| `+` | Discovered, not saved as a contact yet |
| `R` | Repeater |
| `#` | Room / channel server |
| `S` | Sensor |

Use **Up / Down** to scroll, **Execute / Fire** to open a thread or start a reply, and **Cancel** to go back. Replies use the on-screen keyboard (joystick to pick a character, **Execute** to commit, **Cancel** to backspace) with about 70 emoji available.

{{% alert title="RAM-only" color="info" %}}
The inbox holds up to **32 messages across 16 peers** in RAM. Saved contacts and their threads persist across reboots; messages from unsaved peers vanish when the badge restarts. **Save** anyone you want to keep.
{{% /alert %}}

## Channels (group chat)

The **Channel** screen is group / room chat — the same protocol with a broadcast scope. Each row is a channel (for example the default `Public` channel that ships with the preset). Controls match the PMs screen; everyone on the same preset hears every message in a public channel.

## My QR

The **My QR** screen renders your mesh identity as a QR code. Show it to someone else's MeshCore phone or badge for instant pairing — no need to wait for an advert to be heard first.

## Contacts

The **Contacts** list (**Main → Bornagotchi → Contacts**, or jump there from the **Adverts** screen) shows everyone the badge has heard or knows: nearby strangers, saved friends, repeaters and rooms.

| Key | Action |
| --- | ------ |
| Up / Down | Scroll |
| **Up** on the top row | Open the filter (All / Favorites / People / Repeaters / Rooms / Sensors) |
| Execute / Fire | Popup: PM · Info · Add · Save / Unsave · Forget |
| Cancel | Back |

Popup actions:

* **PM** — open the message thread.
* **Info** — hex identity prefix, last-heard time, advert capabilities.
* **Add / Save** — persist the contact in flash so it survives a reboot.
* **Unsave** — drop it from flash (stays in the discovery cache until reboot).
* **Forget** — remove it immediately, even from the discovery cache.

{{% alert title="Save what you want to keep" color="warning" %}}
The discovery cache holds up to 32 unsaved peers in RAM and is empty after every reboot until adverts arrive again. Anything you have not **Saved** — including its message history — is gone on restart. When discovery is full, the oldest unsaved entry is evicted for a new advert.
{{% /alert %}}

## Pinging & visibility

When another badge pings you with the mesh `blinkme` command your LED briefly flashes in the requested colour — a fun way to find friends in a crowd. Your badge also sends its own adverts so others can see you.

## Battery note

The LoRa radio is the single largest battery drain. To save power, **Main → Settings → MeshCore** lets you mute notification sounds. (The e-paper display itself draws no power once an image is shown.)

## Using your phone instead

Prefer to chat from your phone? Install **MeshCore** on Android / iOS or open <https://app.meshcore.nz/>, then pair over Bluetooth — see [Getting started](../getting-started/#pair-with-the-meshcore-app). Once bonded, contacts, chat and settings are all reachable from the app.
