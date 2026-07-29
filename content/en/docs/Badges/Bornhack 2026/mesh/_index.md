---
title: "Mesh & messaging"
linkTitle: "Mesh & messaging"
nodateline: true
weight: 3
---

The badge has a LoRa SX1262 radio, and it speaks the **[MeshCore](https://meshcore.io/)** mesh protocol. Other badges, MeshCore phones and separate repeaters all appear as peers. Four carousel screens use the mesh: **PMs**, **Channel**, **Adverts** and **My QR**. The **Contacts** list holds the peers behind them.

## Getting on the same network

Three things must be the same on every badge in the local mesh:

1. **LoRa preset.** This is the frequency, the bandwidth and the spreading factor. The default preset is **BornHack 2026**, and the firmware includes it. Change it under **Main → Settings → LoRa Radio**.
2. **Public channel key.** The preset shares this key automatically.
3. **Antenna.** Make sure that the LoRa antenna is connected.

If you see no adverts from other badges after a minute, check the preset first.

## Adverts

Every badge, phone and repeater on the mesh broadcasts an **advert** at regular intervals. The advert holds the public name, the identity hash and the capabilities. Your badge lists the adverts it receives on the **Adverts** screen.

| Key | Action |
| --- | ------ |
| Up / Down | Move through the advert list |
| Execute / Fire | Saves the selected advert as a contact |
| Cancel | Go back |
| Left / Right | Go to the next carousel screen |

## Private messages (PMs)

The **PMs** screen is your private inbox. Each row is a peer that sent you a message.

| Marker | Meaning |
| ------ | ------- |
| `●` | Heard less than 5 minutes ago |
| `*` | Favorite |
| `+` | Discovered, but not saved as a contact |
| `R` | Repeater |
| `#` | Room or channel server |
| `S` | Sensor |

Use **Up** and **Down** to move through the list. Use **Execute / Fire** to open a thread or to start a reply. Use **Cancel** to go back. A reply uses the keyboard on the screen. Move the joystick to select a character, press **Execute** to accept it, and press **Cancel** to delete the last character. About 70 emoji are available.

{{% alert title="RAM-only" color="info" %}}
The inbox holds up to **32 messages from 16 peers**, in RAM. The badge keeps saved contacts and their threads through a restart. Messages from peers you did not save disappear when the badge restarts. **Save** every peer you want to keep.
{{% /alert %}}

## Channels (group chat)

The **Channel** screen is the group chat, or room chat. It uses the same protocol with a broadcast scope. Each row is a channel, for example the default `Public` channel in the preset. The controls are the same as on the PMs screen. Every badge with the same preset hears every message in a public channel.

## My QR

The **My QR** screen shows your mesh identity as a QR code. Show the code to another MeshCore phone or badge for an immediate pairing. The other device does not have to wait for an advert.

## Contacts

The **Contacts** list shows every peer the badge heard or knows: nearby strangers, saved friends, repeaters and rooms. Open it under **Main → Bornagotchi → Contacts**, or from the **Adverts** screen.

| Key | Action |
| --- | ------ |
| Up / Down | Move through the list |
| **Up** on the top row | Opens the filter: All, Favorites, People, Repeaters, Rooms or Sensors |
| Execute / Fire | Opens a popup: PM · Info · Add · Save / Unsave · Forget |
| Cancel | Go back |

The popup actions are:

* **PM.** Opens the message thread.
* **Info.** Shows the hex identity prefix, the last-heard time and the advert capabilities.
* **Add / Save.** Writes the contact to flash, so it survives a restart.
* **Unsave.** Removes the contact from flash. It stays in the discovery cache until the next restart.
* **Forget.** Removes the contact immediately, also from the discovery cache.

{{% alert title="Save what you want to keep" color="warning" %}}
The discovery cache holds up to 32 unsaved peers in RAM. It is empty after every restart, until new adverts arrive. A peer you did not **Save** is gone after a restart, together with its message history. When the cache is full, the badge removes the oldest unsaved entry for a new advert.
{{% /alert %}}

## Pinging & visibility

When another badge pings you with the mesh `blinkme` command, your LED flashes shortly in the requested color. This helps you find friends in a crowd. Your badge also sends its own adverts, so other people can see you.

## Battery note

The LoRa radio uses the most battery power. To save power, mute the notification sounds under **Main → Settings → MeshCore**. The e-paper display uses no power after it shows an image.

## Using your phone instead

You can also chat from your phone. Install **MeshCore** on Android or iOS, or open <https://app.meshcore.nz/>. Then pair the phone over Bluetooth. See [Getting started](../getting-started/#pair-with-the-meshcore-app). After the bond, the app gives you the contacts, the chat and the settings.
