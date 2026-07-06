---
title: "Clock, alarm & calendar"
linkTitle: "Clock & alarm"
nodateline: true
weight: 5
---

Three apps share the "watch" carousel slots: **Clock**, **Alarm** (opened from the Clock) and **Calendar**.

## Clock

Two switchable watch faces — digital and analog. A small bell icon in the header lights up when an alarm is armed.

**Open:** push Left / Right until you land on the **Clock** screen.

| Key | Action |
| --- | ------ |
| Up / Down | Toggle digital ↔ analog face |
| Execute / Fire | Enter the alarm editor (slot 0) |
| Left / Right | Next / previous carousel screen |

### Setting the time

The badge has no backup battery for its real-time clock, so the wall clock resets to **None** on every boot and reads "Clock not set" until you set it. Two ways:

* **MeshCore app over Bluetooth** — the phone pushes its time. The easy path.
* **Mesh time advert** — stand near a synced LoRa repeater and the badge picks the time up over the air.

Set the timezone once under **Main → Settings → Timezone** — it persists across reboots (default `+2`, CEST for BornHack).

{{% alert title="No seconds hand" color="info" %}}
A BLE-set time overrides on-air refinement until the next reboot. There is no seconds hand — e-paper refresh is too slow for one.
{{% /alert %}}

## Alarm

Push **Execute / Fire** on the Clock screen to open the alarm editor.

| Key | Action |
| --- | ------ |
| Up / Down | Move between fields (Hour → Minute → Days → Tone → Enabled) |
| Execute / Fire | Drill into / out of a field's edit mode |
| Cancel | Exit back to the watch face |

The **Days** field cycles: Daily · Weekdays · Weekends · None · Custom. The **Tone** field offers ten built-in tunes: Beep, Imperial March, Rickroll, Pink Panther, Sandstorm, Startup, Trololo, Daisy Bell, Nokia, Samsung.

When an alarm fires the buzzer plays the chosen tone up to five times, 8 seconds apart. Any button press silences it; if you ignore it, it stops itself after about 32 seconds.

{{% alert title="Set the clock first" color="warning" %}}
Alarms only fire when the clock is set. After a reboot, if you haven't paired or heard a time advert, the alarm won't go off — pair first.
{{% /alert %}}

## Calendar

A month grid with a per-day timeline of imported iCalendar events.

**Open:** Left / Right to the **Calendar** screen (right of Clock). The grid is shown without a cursor; push **Execute / Fire** to enter active mode.

**Active mode:**

| Key | Action |
| --- | ------ |
| Up / Down | Move the cursor ±7 days (jump a week) |
| Left / Right | Move the cursor ±1 day |
| Execute / Fire | Open the day-detail timeline |
| Cancel | Back to the passive view |

**Day detail (timeline):**

| Key | Action |
| --- | ------ |
| Up / Down | Scroll ±1 hour |
| Left / Right | Scroll long event titles horizontally |
| Execute / Fire | Full day-list (all events as a list) |
| Cancel | Back to the month view |

### Loading events

The badge imports events at boot from a file named **`ALARMS.ICS`** in the root of the USB drive:

1. Plug the USB-C cable into your computer.
2. Open the drive labelled `CYBR<4 hex>`.
3. Drop your `.ics` file in the root, renamed to `ALARMS.ICS`.
4. Eject the drive.
5. Reboot the badge (unplug USB or reset).

You can use the official BornHack programme `.ics` straight from <https://bornhack.dk/>.

{{% alert title="Limits" color="info" %}}
Up to 31 events are stored. Multi-day events are clamped to end at 23:59 on their start day (e-paper doesn't draw events spanning days). All events are RAM-only and re-imported on every boot from `ALARMS.ICS`.
{{% /alert %}}
