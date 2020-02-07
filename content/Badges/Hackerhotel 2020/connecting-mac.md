---
title: "Connecting to Mac"
nodateline: true
weight: 10
---
We get it. The fruity aluminum and glass has a certain appeal. However getting a decent serial connection is a bit of work. Not really hard and a nice way to get started with serial hacking on your Mac!
## Preparations
We assume you're running a modern version of Mac OS. First we'll install brew (if you already have it, just skip ahead.
### Brew
Visit [https://brew.sh](https://brew.sh) and use the oneliner you find there to install it. It will take a bit of time but you'll love it!
### Picocom
Install Picocom using `brew install picocom`.
Done. It's that easy.
### Connecting badge to Mac
Plug in a USB-Serial board, and maybe install some drivers to get it working. 

* CP210x chips are usually labeled /dev/tty.SLAB_USBtoUART
* CH340 chips are labeled ...
* FTDI chips are labeled ...
* Prolific 2303 chips should just die. Please discard.

Connect the 3.3v and GND to the header on the back of the badge. Connect the RX of the badge to the TX of the USB-Serial, and the TX of the badge to the RX of the USB-Serial. 
### Using Picocom
Picocom is a bit spartan. Start it using 

`picocom /dev/tty.SLAB_USBtoUART -b 115200`

type in ? and get going in the awesome experience. Type in a and verify the symbols you see match the symbols you see on the badge. If you get question marks in blocks, weird symbols etc, your locale is not set right.

Press *control-a* and then *control-h* to see Picocom **help**

Press *control-a* and then *control-x* to **exit** Picocom

### Setting Locale (troubleshooting)
