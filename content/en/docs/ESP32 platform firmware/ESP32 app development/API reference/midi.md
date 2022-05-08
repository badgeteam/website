---
title: "MIDI Music Controller"
nodateline: true
weight: 50
---


The *MIDI* API allows you to make your [CampZone 2020](/docs/badges/campzone-2020/) badge act like a MIDI music controller over USB. You can use it to play music on your computer, or control music making programs like Ableton Live.

**Available on:** &nbsp;&nbsp; ✅ [CampZone 2020](/docs/badges/campzone-2020/)


# Example

```python
import midi, time

midi.note_on(midi.CENTRAL_C)
time.sleep(1)
midi.note_off(midi.CENTRAL_C)
midi.note_on(midi.CENTRAL_C+2) # D note (C plus two half tones)
time.sleep(1)
midi.note_off(midi.CENTRAL_C+2)
```

# Reference

| Function            | Parameters                 | Returns | Description                                                                      |
| ------------------ | -------------------------- | ------- | -------------------------------------------------------------------------------- |
| note_on | note, [velocity], [midi_channel]          | - | Sends a note start command with the given optional velocity ("volume", 0-127, default 127). You can change the MIDI channel if wanted (0-15).                                                    |
| note_off | note, [velocity], [midi_channel]          | - | Sends a note stop command with the given optional velocity ("volume", 0-127, default 127). You can change the MIDI channel if wanted (0-15).                                                    |


The [CampZone 2020](/docs/badges/campzone-2020/) hardware supports not only MIDI OUT, but also IN. This means you can receive messages from e.g. your audio program. Ableton Live uses this to command the LEDs on MIDI controllers. However, there is currently no Python API for this yet. It may be included in a future Over-the-Air update.
