---
title: "Connecting on Windows"
nodateline: true
weight: 10
---
We get it. You re a gamer. Or thing you don't have time to debug Linux drivers or don't have the money for a Mac.
## Preparations
We assume you're running a modern version of Windows. 

### PuTTY
Download PuTTY from https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html 

Install PuTTY.
### Connecting to your badge on Windows
Configure the PuTTY menu as follows:

* Under Connection type, select Serial.
* In the Serial line field, enter the COM# for your board, such as COM7.
    * Note: If you did not identify your COM# when setting up your board, navigate to the Device Manager and check for an entry called USB Serial Port
* In the Speed field, type 115200
* Click Open.

### Using PuTTY
When you see a blank screen, press the Enter key twice. A welcoming prompt should be displayed.

Type in `?` and get going in the awesome experience. Type in `a` and verify the symbols you see match the symbols you see on the badge. If you get question marks in blocks, weird symbols etc, your locale is not set right.
