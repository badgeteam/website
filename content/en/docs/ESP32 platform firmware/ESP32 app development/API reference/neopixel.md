---
title: "neopixel"
nodateline: true
weight: 9999
---
# IMPORTANT NOTE TO MCH2022 BADGE USERS!

 *The Neopixel library was reimplemented. Totally differently.
Then we forgot to rename it. You can find some pointers on how to use it in the [MCH2022 MicroPython
docs](/docs/badges/mch2022/software-development/micropython/neopixels/)*

*Sorry about that.*


## Import the library and start the driver
```python
import neopixel
neopixel.enable()
```

## Sending data to the LEDs
Once you have enabled the driver you can start sending data. The driver expects a bytes object containing a byte per channel. The exact meaning of these bytes depends on the type of addressable leds your device uses. The easiest way to generate the needed bytes object is by converting a list into one by wrapping it with ```bytes()```.

```python
import neopixel
neopixel.enable()

ledData = [0xFF,0x00,0x00,0x00]
neopixel.send(bytes(ledData))
```

You can easily repeat patterns by using a simple Python trick: you can "multiply" a list by an amount to have python repeat the list that amount of times. The next example shows this, expecting 3 channels per led and 12 leds to be on the badge. If this is the case then all LEDs on the badge should light up in the same color.

```python
import neopixel
neopixel.enable()

ledData = [0xFF,0x00,0x00] * 12
neopixel.send(bytes(ledData))
```

## Turning all LEDs off

```python
import neopixel
neopixel.enable()

number_of_channels = 3
number_of_leds = 12
ledData = [0x00] * number_of_channels * number_of_leds

neopixel.send(bytes(ledData))
neopixel.disable()
```
