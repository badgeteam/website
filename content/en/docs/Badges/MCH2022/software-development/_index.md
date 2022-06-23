---
title: "Software Development"
linkTitle: "Software Development"
nodateline: true
weight: 1
---



This is a shameless placeholder for the software development section


### Arduino

The ESP32 on the badge can be programmed using the Aduino IDE.

1. Install the [Arduino IDE](https://www.arduino.cc/en/software) if you havn't already.
2. Install ESP32 support using [these instructions](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html)
3. Install [PyUSB](https://pyusb.github.io/pyusb/) using your favourite method.
4. Git clone [ESP32-platform-firmware](https://github.com/badgeteam/ESP32-platform-firmware)

Now write your Arduino sketch as usual, by selecting the ESP32 wrover module.
But instead of uploading your sketch, use `Sketch > Export compiled binary` (ctrl+alt+s)

You'll probably want to install Adafruit_GFX and Adafruit_ILI9341 from the library manager to control the display, and refer to the [pinout](../pinout)

Now you need to plug in the badge, turn it on, and launch [webusb_push.py](https://github.com/badgeteam/mch2022-firmware-esp32/blob/master/tools/webusb_push.py) from the [ESP32-platform-firmware](https://github.com/badgeteam/ESP32-platform-firmware) repo with the path of the binary that Arduino generate in your sketch folder.

```sh
python path/to/webusb_push.py "my cool app" path/to/my_app.ino.esp32.bin --run
```

After a few seconds your app should be runnin on the badge.