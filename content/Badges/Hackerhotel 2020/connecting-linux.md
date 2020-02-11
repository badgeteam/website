---
title: "Connecting on Linux"
nodateline: true
weight: 10
---
We get it. The square black Lenovo is still number one 😊 
## Preparations
We assume you're running a modern version of Linux. 
### Picocom
Install Picocom using `sudo apt install picocom` or `yum install picocom` or `dnf install picocom` or `pacman -S picocom` or `emerge -atv picocom` which ever looks familiar.

Done. It's that easy.
### Connecting to your badge on Linux
Plug in a USB-Serial board, and maybe install some drivers to get it working. 

On your terminal type `ls /dev/tty.*` and hit enter:

* Serial chips are usually labeled /dev/ttyUSB0

If your USB-Serial doesn't show up in `/dev/tty*`then the driver hasn't been installed or isn't working properly (or you have a dead USB port or a dead USB-Serial)

Connect the 3.3v and GND to the header on the back of the badge. Connect the RX of the badge to the TX of the USB-Serial, and the TX of the badge to the RX of the USB-Serial. 
### Using Picocom
Picocom is a bit spartan. Start it using 

`picocom --imap delbs -b 115200 /dev/ttyUSB0`

Instead of `/dev/ttyUSB0` you should possibly use the device name you found earlier.

When you see a blank screen, press the Enter key twice. A welcoming prompt should be displayed.

Type in `?` and get going in the awesome experience. Type in `a` and verify the symbols you see match the symbols you see on the badge. If you get question marks in blocks, weird symbols etc, your locale is not set right.

Press *control-a* and then *control-h* to see Picocom **help**

Press *control-a* and then *control-x* to **exit** Picocom

### Setting Locale (troubleshooting)
