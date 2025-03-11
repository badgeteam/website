---
title: "Disobey 2020"
nodateline: true
weight: -2020
---

![Disobey 2020 badge](badge.jpg)

## Getting started

To navigate the menus on your badge you use the touchbuttons. These buttons might be a bit hidden, but if you look closely at the artwork on the front of your badge you will find the following Gameboy inspired buttons:

 - **START**. this button is usually used to *enter* or *exit* an app or menu
 - **A**. used to *accept* input or to select a menu item
 - **B**. used to go *back*
 - **SELECT**. used to navigate submenus
 - **UP/DOWN/LEFT/RIGHT**. used to navigate through menu options

Exact button functions differ from app to app as the developers can decide to use the buttons as they wish.

You can also use the badge through the USB-serial connection. When connecting to your computer be sure to configure your terminal emulation application to use serial port settings *115200 8n1*. On this serial port you will be greeted with a menu through which you can start apps or drop into a Python shell.

## Using the badge

Once you turn on your badge using the slideswitch you will be greeted by the homescreen, showing the Disobey logo and a welcome message.

To enter the application launcher you press the *START* button.

If your badge doesn't start or starts an app different to the homescreen on power-on then that app might have been configured to be the default app. To restore the *homescreen* app to be the default app hold down the *START* button while switching on power to your badge. This will enter the *recovery menu*. Select the *restore default app* menu option using the *A* button and you're done.

### Installing apps

You can install apps using the **installer** application. You can browse the available apps and publish your own apps online by going to the [Hatchery](https://hatchery.badge.team).

### Setting your nickname

The message displayed on the homescreen can be replaced by your nickname. You can configure your nickname using the *nickname* app.

### Using WiFi

During the event the badge will automatically connect to WiFi. Note that there is no internet access available on the badge WiFi network. When you get home you can easily connect the badge to your own WiFi network by selecting the *WiFi settings* app on the main menu or by navigating to *Settings > WiFi settings* on the serial port menu.

### The keyboard
You select the character you want to type using the arrow keys. Then press *A* to enter the character. Pressing *B* removes the character before the cursor.

You can switch between the **input mode**, **cursor mode** and **confirmation mode** by pressing the *SELECT* button.

In the **cursor** mode you can control the cursor using the arrow keys.

In the **confirmation** mode you can either **accept** your input using the *A* button or **cancel** by pressing the *B* button.

### Exiting apps
Most apps can be quit using the *START* button. This will return you to the **launcher** application.
