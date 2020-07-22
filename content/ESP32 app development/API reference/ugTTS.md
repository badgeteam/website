---
title: "ugTTS Text-to-Speech"
nodateline: true
weight: 50
---


The *ugTTS* API allows you to turn text into synthesized speech by querying Google Translate over WiFi. Either save it as an mp3 file, or play it directly. This module is based on the popular [gTTS](https://github.com/pndurette/gTTS) library.
{{% notice tip %}}
**Available on:** &nbsp;&nbsp; ✅ [CampZone 2020](/badges/campzone-2020/)
{{% /notice %}}

# Example

```python
import wifi, ugTTS

wifi.connect()
if not wifi.wait():
    print('Oh no panic no WiFi')
    import system; system.launcher()

ugTTS.speak('This is a test')  # Plays over speakers
ugTTS.text_to_mp3('This is a test too', '/cache/test_speech.mp3')  # Saves to file for later playback

ugTTS.speak("Slaap kindje slaap", lang='nl') # Dutch
ugTTS.speak("Dommage", lang='fr', volume=100) # French and set volume
```

# Reference

| Function            | Parameters                 | Returns | Description                                                                      |
| ------------------ | -------------------------- | ------- | -------------------------------------------------------------------------------- |
| speak | text, [lang], [volume]          | - | Send piece of text to Google Translate and plays back the synthesized speech at given volume (0-255, default 255). You can optionally change the language, for values check gTTS library.                                                    |
| text_to_mp3 | text, filename, [lang]           | - | Same as speak() except it saves to the given filename.                                                    |

# Known problems
* There is a finite length for the text before Google starts rejecting it.
* We don't expose the interface to set details like speech speed. Pull requests welcome.
