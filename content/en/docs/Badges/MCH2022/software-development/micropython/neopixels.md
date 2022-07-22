---
title: "Neopixels"
linkTitle: "Neopixels"
nodateline: true
weight: 2
---

# Accessing the Kite's neopixels from Python

The kite on the Badge is fitted with 5 neopixels (individually
controllable RGB LEDs). They are accessed through the neopixel
module. 

Here's an example how to control the LEDs:

```
# imports
from machine import Pin
from neopixel import NeoPixel

# Pin 19 controls the power supply to SD card and neopixels
powerPin = Pin(19, Pin.OUT)

# Pin 5 is the LED's data line
dataPin = Pin(5, Pin.OUT)

# create a neopixel object for 5 pixels
np = NeoPixel(dataPin, 5)

# turn on power to the LEDs
powerPin.on()

# set some colors for the pixels (RGB)
np[0] = (255,0,0)
np[1] = (0,255,0)
np[2] = (0,0,255)
np[3] = (255,255,0)
np[4] = (255,0,255)

# send colors out to LEDs
np.write()
```

