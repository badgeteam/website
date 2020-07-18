---
title: "Audio"
nodateline: true
weight: 50
---


The *audio* API allows you to easily play audio files or stream URLs (.mp3, .wav, and modtracker .mod, .s3m, .xm). It is a wrapper around [sndmixer](../sndmixer), which can do much more but is a bit more verbose.
{{% notice tip %}}
**Available on:** &nbsp;&nbsp; ✅ [CampZone 2020](/badges/campzone-2020/)
{{% /notice %}}

# Example

```python
import audio

channel_id = audio.play('/apps/myapp/doom.mp3', volume=150)
```

# Reference

| Function            | Parameters                 | Returns | Description                                                                      |
| ------------------ | -------------------------- | ------- | -------------------------------------------------------------------------------- |
| play               | filename_or_url, [volume], [loop], [sync_beat], [start_at_next], [on_finished]  | Channel ID (int) | Play a file (e.g. '/apps/myapp/sound.mp3') or stream from a url (e.g. 'http://my.stream/song.mp3'). Filename or url needs to end with the filetype (.mp3, .wav, .mod, .s3m, .xm). <br><br>Use volume (0-255) to set the volume for this channel (defaults to system volume). <br><br>Use loop=True to repeat after playback is done. <br><br>Use sync_beat=(BPM of the music, e.g. 120) and start_at_next (1-32) to start playback at the next x-th 8th note (example: 1 starts at next 8th, 2 at next 4th (namely 2x an 8th), 4 at half note, 8 at whole note, 32 at whole bar). <br><br>If on_finished is a function, it is called when the playback ends. <br><br>Resources are automatically freed after playback finishes.                                                     |
| stop_looping       | channel_id                 | - | Cancel the looping status of a channel. This will end playback after the sound is finished with its current playback.                                       |
| stop_channel       | channel_id                 | - | Cancel the playback of a channel immediately, and free its resources.                                       |

# Known problems
* Due to a bug in (presumably) our MicroPython version, stopping audio playback from a streaming URL causes a freeze in the MicroPython task. Therefore, you have to reboot your badge before you can play a different URL.
* The current implementation can play around 4 wav files or 2 mp3 files at the same time without glitches or slowdowns. Any more can cause noticable artifacts.