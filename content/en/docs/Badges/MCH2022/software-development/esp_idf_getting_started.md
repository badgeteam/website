---
title: "ESP-IDF getting started"
linkTitle: "ESP-IDF getting started"
nodateline: true
weight: 1
---



Getting started using esp-idf is slightly different between Linux, Windows and Mac:
- [Go here if you use Linux,](#on-ubuntu-and-debian)
- [Go here if you use Mac.](TEMPLATELINK)
- [Go here if you use Windows,](TEMPLATELINK)


### On Ubuntu and Debian Linux
Open a terminal and install the folowing software:
```bash
sudo apt-get install git wget flex bison gperf python3 python3-venv cmake ninja-build ccache libffi-dev libssl-dev dfu-util libusb-1.0-0
```

### On Arch Linux
Open a terminal and install the folowing software:
```bash
sudo pacman -S --needed gcc git make flex bison gperf python cmake ninja ccache dfu-util libusb
```

Now, download the template app:
```bash
git clone https://github.com/badgeteam/mch2022-template-app my_fancy_app_name
cd my_fancy_app_name
make install
```
This will take about five minutes to complete. After this time, a simple app showing "Hello, World!" will run on your badge.

### Adding your own touch
If you look at line 48 of `main.c`, you can see the text shown on screen:
```c
//...
        // This text is shown on screen.
        char             *text = "Hello, World!";
//...
```
This part is responsible for drawing the text to the screen.
Go ahead and try to edit the text, here shown as "Fancy App!":
![(The text "Fancy App!" on a blueish green background.)](template_fancy_app.jpg)

### Reading the buttons
On line 75 of `main.c`, there is a button handler which either exits the app or changes the background color:
```c
//...
        // Is the home button currently pressed?
        if (message.input == RP2040_INPUT_BUTTON_HOME && message.state) {
            // If home is pressed, exit to launcher.
            exit_to_launcher();
        }
//...
```

Let's change that so the screen is briefly pink after pressing the A button.
```c
//...
        // Button handling.
        if (message.input == RP2040_INPUT_BUTTON_ACCEPT && message.state) {
                // Make a pink background.
                pax_background(&buf, 0xeb34cf);
        } else if (message.input == RP2040_INPUT_BUTTON_HOME && message.state) {
            // If home is pressed, exit to launcher.
            exit_to_launcher();
        }
//...
```
