---
title: "Pin: direct GPIO control"
nodateline: true
weight: 2
---

# Direct GPIO control

The *machine.Pin* API allows you to directly control GPIOs of the ESP32 on your badge.

Please check the schematics of your badge before using this API. If you configure the GPIOs of the ESP32 in a wrong way your might cause your badge to crash, stop responding or even permanently damage it.
Be carefull!

## Basic digital input

```
from machine import Pin
myInput = Pin(0) # GPIO0 (exposed as the "flash" button on most badges)
value = myInput.value()
print("The value of GPIO0 is {}.".format(value))
```

## Basic digital output

```
from machine import Pin
myOutput = Pin(<GPIO NUMBER>, Pin.OUT) # Check the schematic of your badge to find the numbers which can be entered here
myOutput.value(True) # Set the pin state to 1 or "HIGH"
```

## Interrupts

(To-Do)

## Pulse Width Modulation (PWM)

(To-Do)


## Wakeup from deep-sleep

(To-Do)
