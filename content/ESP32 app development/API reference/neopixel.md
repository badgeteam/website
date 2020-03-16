---
title: "neopixel"
nodateline: true
weight: 9999
---

Init & turn off all LEDs
```
import neopixel

neopixel.enable()
ledData = [0x00, 0x00, 0x00]*12
neopixel.send(bytes(ledData))
```
Turn all LEDs on
```
neopixel.send(bytes([0xFF, 0xFF, 0xFF]*12))
```

From disobey sponsor-app
```
import neopixel

neopixel.enable()
ledStop = False
def ledThread():
  global ledStop
  ledState = 0
  ledData = [0x00, 0x00, 0x00]*12
  while True:
	for i in range(len(ledData)):
	  if ledData[i] > 64:
		ledData[i] -= 64
	  else:
		ledData[i] = 0
	if not ledStop:
	  ledData[ledState*3] = 0xFF
	  ledData[(11-ledState)*3+1] = 0xFF
	  ledData[ledState*3+2] = 0xFF
	  ledData[(11-ledState)*3+2] = 0xFF
	neopixel.send(bytes(ledData))
	ledState = ledState + 1
	if ledState > 11:
	  ledState = 0
	time.sleep_ms(50)
```
