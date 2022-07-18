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

If you have it already installed, make sure to check that you have the latest version via `App update`.

There are several ways to run badgepython and develop badgepython applications. None of them are particularly well documented, so it's up to you to explore what you can do and how to do it in a smart way. Here are a few starting points:

## Run python interactively

Start python on your badge (`apps` -> `Python`). There should be a message on screen that there's an interactive Python console on your USB serial connection. Baud rate is 115200. Connect to it using a serial terminal of your choice (e.g. `screen /dev/tty.<your_serial> 115200`, you may also use other terminal emulators such as `PuTTY` or `picocom` based on your OS and/or preference). The badge typically exposes two serial ports, simply try - one should give you access to a terminal.

You can now run python interactively. For example, run `print("That was easy!")`. Amazing! 

This not only a great way to try stuff, it is also an easy access to your badge's file system. Type `import os`, then `os.listdir("/")` to see the root filesystem. There's a FAT partition on the badge's internal flash mounted at `/`. If you have a MicroSD card installed, its contents will be mounted at `/sd`. You can traverse the directories with `os.listdir()` (and you will see that Python apps live at `/apps/python/<appname>/`). You can create and remove directories with `os.mkdir` and `os.rmdir` and delete files `os.remove`. Don't screw up your filesystem too badly. There's more documentation on basic micropython's OS library [in the MicroPython documentation](https://docs.micropython.org/en/latest/library/os.html).

Try using the screen: `import display`, `display.drawFill(0xFF0000)`, `display.flush()`. Red!

`display` is a badge-specific moduleThere are several Badge-specific modules. You can find documentation on them [in the CampZone 2020 badge documentation](https://badge.team/docs/badges/campzone-2020/) (they might not be all fully up-to-date, but good enough for a start). In addition there is also a `mch22` module that offers a few
badge-specific APIs. Finding out about it's features is left as an exercise to the reader (hint: `import mch22`, `dir(mch22)`).

## Develop micropython apps in the emulator

Uri Shaked a.k.a [Wokwi](https://wokwi.com/projects/335445228923126356) built
an awesome emulation of the badge that runs in your browser. This is an amazing way to quickly get started with app development. It's not as fast as your badge, but it implements a surprising amount of the peripherals. [Just try it.](https://wokwi.com/projects/335445228923126356)

## Run an app on the Badge itself

Have a look at your filesystem and example apps in the [Hatchery](https://mch2022.badge.team) (btw: browsing the hatchery is a great resource for examples). You will see that each app resides in its own directory `/apps/python/<appname>`. The main entry point is `__init__.py` inside that directory. The directory may contain other python sources and resource files. Apps stored in the internal flash reside in `/apps/python`, apps on the (optional) SD card reside in `/sd/apps/python/`.

Create your own app folder (let's call it `/apps/python/myapp` in this example) using the interactive Python console described above. 

Now it's time to code using a text editor of your choice. If you're not sure what and how to program, you can use the following example:

```
import display
import random

def drawRandomLine():
  x1 = random.randint(0,320)
  x2 = random.randint(0,320)
  y1 = random.randint(0,240)
  y2 = random.randint(0,240)
  color = random.randint(0,0xFFFFFF)
  display.drawLine(x1,y1,x2,y2,color)
  display.flush()

display.drawFill(0xFFFFFF)
while True:
  drawRandomLine()
```

This program will clear the screen and then draw random lines infinitely.

Save that file as, say, `__init__.py`.

To upload the file to the Badge, you can clone the [mch2022 tools](https://github.com/badgeteam/mch2022-tools). These contain scripts to upload files to the badge via WebUSB.

Python apps reside in the FatFS partitions inside the badge's internal flash and/or the optional SD card, so you should use the `webusb_fat_***` scripts. Try `python3 tools/webusb_fat_ls.py /`. You will see that the root directory listing contains two entries: `flash` and `sdcard` (the mount points for the internal and external partitions).

See? The the micropython and WebUSB paths differ: We will need our file to `/flash/apps/python/myapp/__init.py` in order to get it to Python's `/apps/python/myapp/__init.py` path.

So you should be able to use something like `python3 tools/webusb_fat_push.py __init__.py /flash/apps/python/myapp/__init__.py` to upload your file to the Badge (know your paths). You should see a progress message and a success message on the terminal and your badge screen. If you get an Unicode error, you can most likely fix it by changing the `fill` character in the `webusb.py` script (two occurrences).

After uploading, you should be ready to launch your app on the Badge (`apps` -> `myapp`) and see colourful lines on the screen. If your script contains errors, you will typically see a crash message on screen. To see error messages, connect your serial terminal (see above) to the badge before starting your app.

## Be nice

Unfortunately, there's no way to end the app yet, so you have to restart your badge by power cycling it (or using the `webusb_reset.py` script in the `tools` folder or uploading another file). Let's add that by editing your `__init__.py` file:

```
import display
import random
import buttons
import mch22

def reboot(pressed):
  if pressed:
    mch22.exit_python()

buttons.attach(buttons.BTN_A,reboot)

def drawRandomLine():
  x1 = random.randint(0,320)
  x2 = random.randint(0,320)
  y1 = random.randint(0,240)
  y2 = random.randint(0,240)
  color = random.randint(0,0xFFFFFF)
  display.drawLine(x1,y1,x2,y2,color)
  display.flush()

display.drawFill(0xFFFFFF)
while True:
  drawRandomLine()
```
The additional lines will add a key listener that will trigger a reset when the `A` key is pressed.

Repeat the upload using the `webusb_fat_push.py` script. Restart your app. Done!

## Publish your work!

After you're done writing an amazing app (and writing an amazing `README.md` with it), share it with others! The [Hatchery](mch2022.badge.team) is the Badge's "App store". You can read about publishing eggs in the hatchery [here](../hatchery/).

