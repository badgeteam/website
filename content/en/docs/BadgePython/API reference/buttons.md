---
title: "Buttons"
nodateline: true
weight: 10
---

The *buttons* API allows you to read the state of the buttons on a badge.
This API encapsulates the drivers for different button types.

# Badge support
This API is currently supported on the following badges:

 - SHA2017
 - Hackerhotel 2019
 - Disobey 2019
 - CampZone 2019
 - Disobey 2020
 - Fri3dcamp 2018

Support for GPIO buttons and touch-buttons via the MPR121 touch controller IC are supported. Touch buttons using the touch button features of the ESP32 can not be used (yet).

# Reference

| Command            | Parameters                 | Description                                                                      |
| ------------------ | -------------------------- | -------------------------------------------------------------------------------- |
| attach             | button, callback function  | Attach a callback to a button                                                    |
| detach             | button                     | Detach a callback from a button                                                  |
| value              | button                     | Get the current value of a button                                                |
| getCallback        | button                     | Get the current callback of a button                                             |
| pushMapping        | [mapping]                  | Switch to a new button mapping                                                   |
| popMapping         | *none*                     | Switch back to the previous button mapping                                       |
| rotate             | degrees                    | Adapt the button layout to an orientation. Accepts 0, 90, 180 and 270 as values. |

# Button availability per badge
| Name   | SHA2017 | Hackerhotel 2019 | Disobey 2019 | CampZone 2019 | Disobey 2020 | MCH2022 |
|--------|---------|------------------|--------------|---------------|--------------|---------|
| A      | Yes     | Yes              | Yes          | Yes           | Yes          | Yes     |
| B      | Yes     | Yes              | Yes          | Yes           | Yes          | Yes     |
| SELECT | Yes     | Yes              | No           | No            | Yes          | Yes     |
| START  | Yes     | Yes              | No           | No            | Yes          | Yes     |
| UP     | Yes     | Yes              | Yes          | Yes           | Yes          | Yes     |
| DOWN   | Yes     | Yes              | Yes          | Yes           | Yes          | Yes     |
| LEFT   | Yes     | Yes              | Yes          | Yes           | Yes          | Yes     |
| RIGHT  | Yes     | Yes              | Yes          | Yes           | Yes          | Yes     |
| HOME   | No      | No               | No           | No            | No           | Yes     |
| MENU   | No      | No               | No           | No            | No           | Yes     |

# Default callback per button
| Name   | SHA2017  | Hackerhotel 2019 | Disobey 2019 | CampZone 2019 | Disobey 2020 | MCH2022  |
|--------|----------|------------------|--------------|---------------|--------------| -------- |
| A      |          |                  |              |               |              |          |
| B      |          |                  | Exit app     | Exit app      |              |          |
| SELECT |          |                  |              |               |              |          |
| START  | Exit app | Exit app         |              |               | Exit app     |          |
| UP     |          |                  |              |               |              |          |
| DOWN   |          |                  |              |               |              |          |
| LEFT   |          |                  |              |               |              |          |
| RIGHT  |          |                  |              |               |              |          |
| HOME   |          |                  |              |               |              | Exit app |
| MENU   |          |                  |              |               |              |          |


# Callback implementation:

to use the buttons, you need to implement a callback function:

```

import buttons, display # Imports 2 libraries to use the buttons, the display library, as well as the buttons library
def on_action_btn(pressed): # Defines a function on_action_btn with the required parameter pressed
    if pressed: # Uses an if statement to check if the button has been pressed
        display.drawFill(display.BLACK) # If the button is pressed, sets the screen to black
        display.drawText(10,10,"Hack The Planet!!!", display.GREEN, "roboto_regular18") # Draws text if the button is pressed
        display.flush() # Flushes the screen to draw the text and color onto the screen
buttons.attach(buttons.BTN_A, on_action_btn) # Assigns the function on_action_btn to the A button
```

