---
title: "APIs: Graphics"
linkTitle: "Graphics"
nodateline: true
weight: 1
---

PAX Grahics is the default way to draw graphics for the MCH2022 babdge.
Don't want the getting started? [Complete API can be found here.](https://github.com/robotman2412/pax-graphics/tree/main/docs#pax-graphics-documentation)


# Getting started
First, want to download [the template app](https://github.com/badgeteam/mch2022-template-app):
```bash
git clone https://github.com/badgeteam/mch2022-template-app my_fancy_app
make install
```
This will download and install the template app to your badge, showing a colorful "Hello, World!".

Simply repeat the `make install` step every time you want to test your app.

To avoid clutter, remove the graphics from the while loop and make a function just graphics:
```c
// before main ...
// A neat little graphics function.
void my_fancy_graphics() {
    // This fills the screen with blue.
    // Color:              aarrggbb (like #rrggbb but with 0xff instead of #).
    pax_background(&buf, 0xff0000ff);
}
// in main ...
    while (1) {
        // Call our graphics function.
        my_fancy_graphics();
        // Draw them to the screen.
        disp_flush();
        
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
Do note that graphics aren't shown on screen immediately, that part is the job of `disp_flush()`.

## Simple helloworld
Let's start by drawing some white text on the blue background:
```c
//...
// A neat little graphics function.
void my_fancy_graphics() {
    // This fills the screen with blue.
    // Color:              aarrggbb (like #rrggbb but with 0xff instead of #).
    pax_background(&buf, 0xff0000ff);
    // This draws white text in the top left corner.
    float text_x     = 0;                   // Offset from the left.
    float text_y     = 0;                   // Offset from the top.
    char *my_text    = "Hello, World!";     // You can pick any message you'd like.
    float text_size  = 18;                  // The normal size for saira regular.
    pax_draw_text(&buf, 0xffffffff, pax_font_saira_regular, text_size, text_x, text_y, my_text);
}
//...
```
![(The text "Hello, World!" on a blue background.)](pax_helloworld.jpg)

We encourage you to try what happens when you change some of the parameters. Try changing `text_x` and `text_y` to see where it appears on screen, or maybe change `text_font` to (for example) `pax_font_sky`.

