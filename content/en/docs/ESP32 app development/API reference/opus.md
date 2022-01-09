---
title: "opus"
nodateline: true
weight: 9999
---

# Encoding data

To encode data, you have to know the sampling rate and number of channels and create an `Encoder`:

```
import opus
sampling_rate = 8000
stereo = False
encoder = opus.Encoder(sampling_rate, stereo)
```

Then you can use the encoder to encode audio frames. Those may have lengths of 2.5, 5, 10, 20, 40, or 60 milliseconds. Input data should be of type `bytes` or `bytearray` and contain 16-bit signed integers:

```
# One frame of data containing 480 null samples
input = bytearray(960)
# Encode the data, using at most 128 bytes for the frame. This would be around 2 kByte/s. At 8 kHz sampling rates, opus will use around 1 kByte/s for mono audio.
output = encoder.encode(input, 128)
```

Each encoded frame has some metadata at the beginning containing the channel,
frequency, and the encoded size of the frame. This allows combining frames
into one packet.

# Decoding data

Decoders do not take any arguments with their constructor, because they take the necessary information from their input frames:

```
import opus
decoder = opus.Decoder()
```

The created decoder can handle any data created by `opus.Encoder`, even if the
number of channels or the sampling rate differs - it will get reinitialized to
match the new settings.

```
encoder = opus.Encoder(8000, 0)
decoder = opus.Decoder()

input = bytearray(960)
encoded = encoder.encode(input, 128)
decoded = decoder.decode(encoded)
```
