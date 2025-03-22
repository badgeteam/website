---
title: "Konsool quick start"
linkTitle: "quick start"
nodateline: true
weight: -20
---

# Quick start

## Peripherals  

<a href="./konsool-frontpanel.svg" target="_blank"><img src="./konsool-frontpanel.svg" style="display: block; margin: 0 auto 4rem auto; padding: -1rem; width: 60%"></a>

# Navigation

### Powering on the badge

Keep the power button pressed for ~2 seconds, until the power button turns red.

Powering off is done in the same manner.

### Moving around in the launcher

- Navigation is done using the arrow keys to navigate the menus.
- An item can be activated by pressing the 'enter' key.

### Returning back to the launcher

Exiting an application back to the launcher should be done using: the red '<span style="color: red">X</span>' function button, which is located next to the escape.

When a program is started, basically a new firmware image is loaded into the ESP32-P4 so this will not work for all applications.
Applications that behave well should support this though, and should return to the launcher.

### Changing the badge

The badge is charged via the USB-C connector at the top left of the device.

Since no handshake is done the amount of power a device is allowed to pull from the USB port is 0.5A, this means the battery at this time won't charge quickly.

