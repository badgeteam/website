---
title: "Troubleshooting"
nodateline: true
weight: 999
---

## Boot issues

### When on battery
Brownout protection might be kicking in on boot, try plugging in the micro USB and press the reset button.

### With USB plugged in
Try disconnecting the battery to see if that causes the problems. If the badge still does not respond try connecting using a terminal emulator to see what's going on.

## Display

### Sluggish
When your display responds sluggish (more than on other badges) or is for instance unable to clear the display in one pass, check the soldering on the display connector first. 

### Ghosting
When you update the display too frequently without proper clearing cycles (inverted image, black screen, white screen, positive image) you may experience something that looks like it was burned in. You can recover your screen by doing the black and white flashes (LOTS of them). Also letting the display rest (without power!) seems to alleviate the issue. So expect ghosting/burn-in when you are doing animations. We do not know the long term effect of (ab)using the display like this. 

### Removing
Removing the display is not something we recommend. Break it at your own risk. The trick seems to be to first remove the cable from the connector on the back, pull it through the hole. Now you can carefully push and wiggle the display downward towards the buttons. If you're lucky the glue-dots havent hardened yet and you can remove the display. Come by the badge tent for new gluedots when you're done (limited supplies). 

## Touch input and LED/SD card power control (MPR121)

### Touch input is not working
Check the soldering on the MP121. Reflow if necessary. 

### LED power not working
If your LEDs aren't getting any power either the MPR121 or the transistor is suspect. 

### Buzzer motor not working
Either the MPR121 or the transistor are suspect.

## Other issues
Please [contact](/contact/) us to help you figure things out either [online](/contact/) or by visiting us at a camp or event.
