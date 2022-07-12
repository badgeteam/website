---
title: "Developing Badge Apps with MicroPython"
linkTitle: "MicroPython"
nodateline: true
weight: 1
---


# Introduction ...

The Badge comes with a preinstalled Micropython interpreter. Python
should be the easiest way to control the device and the easiest mode to
write apps for The Badge, especially if you are a beginner or don't want
to spend a lot of time downloading toolchains and debugging drivers.

First, make sure Python is installed and that you didn't accidentally
delete it. Check in the `apps` menu. If it's not there: install the
Python app from the Hatchery by going to `Hatchery -> ESP32 native
binaries -> Utility -> Python` and install it either onto the flash or
onto an SD card.

This badge contains a common ESP32 firmware platform shared with other
badges, so to learn more about the general platform and its components,
[start
here](../../../esp32-platform-firmware/esp32-app-development/getting-started/first_egg/).
In addition there is also a `mch22` module that offers a few
badge-specific APIs.

While the above allows you to access the Python shell and install Python
apps from the hatchery, here is how you upload custom apps to the badge
over USB:

1. Download [mch2022-tools](https://github.com/badgeteam/mch2022-tools/archive/refs/heads/master.zip)
2. Write you Python code using the platform modules documented above
3. Use `python3 webusb_fat_push.py __init__.py /sdcard/apps/python/myapp/__init__.py`
4. Start your app in the Apps menu.


