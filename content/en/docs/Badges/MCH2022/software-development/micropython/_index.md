---
title: "Developing Badge Apps with MicroPython"
linkTitle: "MicroPython"
nodateline: true
weight: 1
---

This is the starting point for BadgePython development. There's an
[introduction / tutorial](./introduction) to get you started. We 
highly recommend to play through this tutorial as it will also tell
you how to build Badge apps and some caveats during this process.

The tutorial will show you how to access the display and buttons.
[Here's a guide on how to access the NeoPixel LEDs](./neopixels).
This section will eventually (hopefully) fill with documentation
on other peripherals. This is still work in progess. Please feel
free to contribute...

Check out the [API
Guide](/docs/esp32-platform-firmware/esp32-app-development/api-reference/#badgeteam-platform-apis)
to see what the badge can do.

Check out [this link for an example of using the
**accelerometer**](https://gist.github.com/smunaut/2910d12ae19d1b8aec33a76a7a425b36)

If you would like to know how hot or humid it is, check the [BME680
example](https://mch2022.badge.team/files/4486) from the hatchery. Actually,
this tells you about the air pressure, but you can hack it to also display temp
and humidity...
