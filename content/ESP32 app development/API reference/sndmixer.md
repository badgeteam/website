---
title: "sndmixer"
nodateline: true
weight: 9999
---

(This page is still an ongoing effort and might contain mistakes.)

# Starting the audio subsystem
The sound-mixer task runs on the second CPU core of the ESP32 and is able to mix together multiple auto streams and feed them to the DAC of your device.

The sound-mixer task needs to be started before any other audio related function can be used. Starting the sound-mxier task is done using the following API command:

```
import sndmixer
sndmixer.begin(<number-of-channels>, <enable-stereo>)
```

Starting the sound-mixer with only one channel and with stereo enabled (```sndmixer.begin(1, True)```) results in the best audio quality but does not allow you to play multiple audiostreams at the same time. We recommend you start the sound-mixer task with an amount of channels you actually plan on using.

Note: it is currently not possible to stop the sound-mixer task, change the number of channels or stereo mode without restarting your badge. We're working on adding this functionality in the future.

# Playing MP3 music
MP3 files can be played by reading the MP3 compressed sample data from a bytearray buffer or by reading from a stream by means of the file-descriptor.

Playing an MP3 file directly from a bytearray has the added benefit that you can play the MP3 file multiple times at the same time. This allows you to create basic soundboard effects where the same sample can be triggered while it is already playing.

Playing an MP3 file from a stream (fd) allows for playing larger files without loading them fully into ram before playing, this is usefull for background music as longer MP3 files can be played easily. This method can also be used to play MP3 streams directly from the internet.

## Playing an MP3 file using the bytearray method
```
# Preparation: start the sound-mixer task
import sndmixer
sndmixer.begin(2, True)

# First we load the MP3 file into memory
with open("music.mp3", "rb") as fd:
  mp3data = fd.read()

# Then we play the mp3 file
audioStreamId = sndmixer.mp3(mp3data)

# Now that the stream is playing we can set the volume (0-255)
sndmixer.volume(audioStreamId, 50)
```

## Playing an MP3 file using the stream method
```
# Preparation: start the sound-mixer task
import sndmixer
sndmixer.begin(2, True)

# First we create a file-descriptor pointing to the MP3 file
mp3file = open("music.mp3", "rb")

# Then we play the mp3 file by passing the file-descriptor to the sound-mixer task
audioStreamId = sndmixer.mp3_stream(mp3file)

# Now that the stream is playing we can set the volume (0-255)
sndmixer.volume(audioStreamId, 50)
```

# Playing tracker music
The sound-mixer can play mod, s3m and other tracker music files (your mileage may vary).

```
# Preparation: start the sound-mixer task
import sndmixer
sndmixer.begin(2, True)

# First we load the tracker music file into memory
with open("music.s3m", "rb") as fd:
  moddata = fd.read()

# Then we play the tracker music file
audioStreamId = sndmixer.mod(moddata)

# Now that the stream is playing we can set the volume (0-255)
sndmixer.volume(audioStreamId, 50)
```

# Playing wave files
This is ment for playing short sound effects or samples. You could even generate the samples using python if you wanted to!

```
# Preparation: start the sound-mixer task
import sndmixer
sndmixer.begin(2, True)

# First we load the wave file into memory
with open("music.wav", "rb") as fd:
  wavdata = fd.read()

# Then we play the wave file
audioStreamId = sndmixer.wav(wavdata)

# Now that the stream is playing we can set the volume (0-255)
sndmixer.volume(audioStreamId, 50)
```

# Synthesizer
A (very) basic synthesizer is available as well. It currently generates sine, square and saw waves at a frequency and volume of your choosing. Each waveform generated uses one mixer channel.

```
# Preparation: start the sound-mixer task
import sndmixer
sndmixer.begin(3, True)

# Create the synthesizer channel
synthId = sndmixer.synth()

# Set the volume of the synthesizer channel
sndmixer.volume(synthId, 50)

# Set the frequency to 100Hz
sndmixer.freq(synthId, 100)
```
