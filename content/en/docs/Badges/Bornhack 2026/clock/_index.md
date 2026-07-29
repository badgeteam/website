---
title: "Clock, alarm & calendar"
linkTitle: "Clock & alarm"
nodateline: true
weight: 5
---

Three apps use the watch slots of the carousel: **Clock**, **Alarm** and **Calendar**. You open the Alarm from the Clock.

## Clock

The Clock has two watch faces, digital and analog. A small bell icon in the header appears when an alarm is on.

**To open it:** press Left or Right until the badge shows the **Clock** screen.

| Key | Action |
| --- | ------ |
| Up / Down | Changes between the digital face and the analog face |
| Execute / Fire | Opens the alarm editor (slot 0) |
| Left / Right | Goes to the next or the previous carousel screen |

### Setting the time

The badge has no backup battery for its real-time clock. The clock therefore returns to **None** at every start, and it shows "Clock not set" until you set it. You can set it in two ways:

* **With the MeshCore app over Bluetooth.** The phone sends its time. This is the easy method.
* **With a mesh time advert.** Stay near a synchronized LoRa repeater, and the badge takes the time over the air. The badge accepts a time over the air only from a *trusted* source. That is a repeater or companion advert with a verified signature, or a channel that you hold the key for. Other badges near you cannot set your clock.

Set the timezone once, under **Main → Settings → Timezone**. The badge keeps that setting through a restart. The default is `+2`, which is CEST for BornHack.

{{% alert title="No seconds hand" color="info" %}}
A time from BLE overrides the refinement over the air until the next restart. The watch face has no seconds hand, because the e-paper refresh is too slow for one.
{{% /alert %}}

## Alarm

Press **Execute / Fire** on the Clock screen to open the alarm editor.

| Key | Action |
| --- | ------ |
| Up / Down | Moves between the fields: Hour, Minute, Days, Tone, Enabled |
| Execute / Fire | Enters or leaves the edit mode of a field |
| Cancel | Returns to the watch face |

The **Days** field steps through Daily, Weekdays, Weekends, None and Custom. The **Tone** field has ten built-in tunes: Beep, Imperial March, Rickroll, Pink Panther, Sandstorm, Startup, Trololo, Daisy Bell, Nokia and Samsung.

At the alarm time, the buzzer plays the selected tone up to five times, with 8 seconds between them. Any button press stops the alarm. If you do nothing, the alarm stops after about 32 seconds.

{{% alert title="Set the clock first" color="warning" %}}
An alarm sounds only when the clock is set. After a restart, pair the badge or wait for a time advert. Until then, the alarm does not sound.
{{% /alert %}}

## Calendar

The Calendar is a month grid with a timeline for each day. It shows the iCalendar events you imported.

**To open it:** press Left or Right to the **Calendar** screen, to the right of the Clock. The grid appears without a cursor. Press **Execute / Fire** to enter the active mode.

**Active mode:**

| Key | Action |
| --- | ------ |
| Up / Down | Moves the cursor 7 days, one week |
| Left / Right | Moves the cursor 1 day |
| Execute / Fire | Opens the timeline of the day |
| Cancel | Returns to the passive view |

**Day detail (timeline):**

| Key | Action |
| --- | ------ |
| Up / Down | Moves 1 hour |
| Left / Right | Moves a long event title horizontally |
| Execute / Fire | Shows the full day list, with all events |
| Cancel | Returns to the month view |

### Loading events

The badge imports events at the start, from a file with the name **`ALARMS.ICS`** in the root of the USB drive:

1. Connect the USB-C cable to your computer.
2. Open the drive with the name `CYBR<4 hex>`.
3. Copy your `.ics` file to the root, with the name `ALARMS.ICS`.
4. Eject the drive.
5. Restart the badge. Slide the **ON/OFF** switch at the top left of the front off, then back on.

You can use the official BornHack program `.ics` from <https://bornhack.dk/>.

{{% alert title="Limits" color="info" %}}
The badge stores up to 31 events. It cuts an event that covers more than one day. The event then ends at 23:59 on the first day, because the e-paper view draws no event over more than one day. All events are in RAM only, and the badge imports them again from `ALARMS.ICS` at every start.
{{% /alert %}}

### Import limits & quirks

The parser is minimal on purpose. If events are absent or wrong, one of these limits is usually the cause:

* **File size: 16 KiB maximum.** The parser cuts the rest of the file, in the middle of an event, without a message. A full conference program is larger than this. Cut it first with the firmware's [`scripts/strip_ics.py`](https://codeberg.org/Ranzbak/bornhack-firmware-2026/src/branch/main/scripts/strip_ics.py). That script removes `DESCRIPTION`, `UID` and similar fields, and it accepts `--from`, `--to` and `--max` to select a range.
* **31 events maximum.** The import stops at the limit without a message. Later events in the file never appear.
* **No recurrence.** The parser ignores `RRULE`. A repeated event imports as its first occurrence only. Export an expanded ICS file with one entry for each occurrence. The BornHack program is already expanded.
* **No all-day events.** The parser drops a `DTSTART` with a date and no time, without a message. Give the event a real start time.
* **ASCII only.** The parser removes non-ASCII characters from titles. It does not transliterate them, so `Æ`, accented letters and emoji disappear.
* **Timezones.** The parser shifts only timestamps with the `Z` suffix, which are UTC, to local time. It always uses the built-in default of **UTC+2**, which is correct for BornHack, because the import runs before the badge applies your saved timezone. The parser takes floating times and `TZID=` times without a change. Export in UTC if you are not sure.
* **An event that fired disappears from the Calendar until the next start.** Imported events are single-shot alarms. After one fires, the grid and the day view no longer show it. A restart imports everything again.
* **Changes take effect at the start only.** Replace `ALARMS.ICS`, eject the drive correctly, then power cycle the badge.
