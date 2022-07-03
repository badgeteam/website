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
                // Update the screen.
                disp_flush();
                // Wait for half a second.
                vTaskDelay(pdMS_TO_TICKS(500));
                // After this, it loops again with a new random background color.
        } else if (message.input == RP2040_INPUT_BUTTON_HOME && message.state) {
            // If home is pressed, exit to launcher.
            exit_to_launcher();
        }
//...
```
![(A pink screen when the A button is pressed.)](template_pink_screen.jpg)

### Using WiFi
The little template app you've been playing with has a simple WiFi connection API.
First, empty the while loop so it looks like this:
```c
//...
    while (1) {
        // Await any button press and do another cycle.
        // Structure used to receive data.
        rp2040_input_message_t message;
        // Await forever (because of portMAX_DELAY), a button press.
        xQueueReceive(buttonQueue, &message, portMAX_DELAY);
        
        // Is the home button currently pressed?
        if (message.input == RP2040_INPUT_BUTTON_HOME && message.state) {
            // If home is pressed, exit to launcher.
            exit_to_launcher();
        }
    }
//...
```
This is because we're going to get information from the internet instead of writing "Hello, World!" to the screen.
Now, call `wifi_connect_to_stored()` to connect to WiFi:
```c
//...
    // Init (but not connect to) WiFi.
    wifi_init();
    // Now, connect to WiFi using the stored settings.
    bool success = wifi_connect_to_stored();
    if (success) {
        // Green color if connected successfully.
        pax_background(&buf, 0xff00ff00);
    } else {
        // Red color if not connected.
        pax_background(&buf, 0xffff0000);
    }
    disp_flush();
//...
```
![(A red screen and a green screen side by side.)](template_wifi.png)

What you want to do with WiFi varies a lot, so we can't explain that here. But if you have other libraries that need WiFi (for example an MQTT client), you start them after this code.

For further information:
- [Official ESP-IDF WiFi and network API](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/network/index.html#wi-fi)
- [Tickets App using WiFi (example)](https://github.com/badgeteam/mch2022-esp32-app-tickets)
- [Official ESP-IDF HTTP client API](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/protocols/esp_http_client.html)
