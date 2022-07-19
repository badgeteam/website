---
title: "ESP-IDF fancy name tag"
linkTitle: "ESP-IDF fancy name tag"
nodateline: true
weight: 3
---

There are endless games and apps to explore on the badge, but when going about your business on the camp, most likely its main function will be a name tag. So what better than writing a custom name tag to show off your style, identity, hacker skills, memes, or whatever you want.

After having completed the [getting started](../esp_idf_getting_started/) you should have a template app that can draw a colored background and some text. Change the text to your name, and you have yourself a name tag... right? Let's explore some ways in which you can spice up your name tag.

# Other drawing functions

The [pax-graphics documentation](https://github.com/robotman2412/pax-graphics/tree/main/docs) has quite a nice list of all the fonts and drawing primitives it contains.

Drawing lines and circles may sound a bit boring, but if you duck ["line patterns"](https://duckduckgo.com/?q=line+pattern&t=ffab&iar=images&iax=images&ia=images) or ["geometric pattern"](https://duckduckgo.com/?q=geometric+pattern&t=ffab&iar=images&iax=images&ia=images) or similar queries you can find quite some nice patterns to draw with those basic shapes.

In addition I'd like to draw your attention to the [shaders documentation](https://github.com/robotman2412/pax-graphics/blob/main/docs/shaders.md) which has a nice example to draw rainbows on shapes, which you could easily adapt to do all sorts of nice gradients.

# Drawing images

Geomeric patterns are nice, but if you want to show off your art, the logo of your favourite retrocomputer, a character from your favourite franchise, or your favourite meme, you'll want to load images onto the screen.

The pax-graphics side of [drawing images](https://github.com/robotman2412/pax-graphics/blob/main/docs/codecs.md) is well documented. But before you get to that point, there are a few things you need to do.

Of course first you need to find or make an image. This part is up to you. Keep in mind that the badge screen is 320x240 pixels, and that pax-graphics only loads png.

Next you'll need to get the image onto the badge. Since internal flash space is extremely limited, it's highly recommended to use a micro SD card. [Be careful when inserting it!](../../../getting-started/sdcard/) To push the png image to the SD card:

```sh
python3 tools/webusb_fat_push.py myimg.png /sdcard/myimg.png
```

To use the SD card, you need to include the component, and mount it. Then you can open the file.

```c++
#include "sdcard.h"

// image buffer
static pax_buf_t myimage;

// mount sd card
esp_err_t res  = mount_sd(GPIO_SD_CMD, GPIO_SD_CLK, GPIO_SD_D0, GPIO_SD_PWR, "/sd", false, 5);
if(res != ESP_OK) ESP_LOGE(TAG, "could not mount SD card");

// open file
FILE* fd = fopen("/sd/myimg.png", "rb");
if(fd == NULL) ESP_LOGE(TAG, "could not open file");

// store as a buffer for later use, best for animations
if(!pax_decode_png_fd(&myimage, fd, PAX_BUF_16_565RGB, 0)) ESP_LOGE(TAG, "could not parse png");
pax_draw_image(&buf, &myimage, x, y);

// or draw directly, simplest for static drawings
if(!pax_insert_png_fd(&buf, fd, x, y, 0)) ESP_LOGE(TAG, "could not parse png");
```

If you do not have a micro SD card, and you only want to load a small image, you can also [mount the internal filesystem](https://github.com/badgeteam/mch2022-firmware-esp32/blob/0338054c0111106a74008b0d1fe56d905ec0403f/main/filesystems.c#L21-L43) instead.

# Making animations

An animation is just some static drawings in a row. Once again, it's what you do with it.

The template app already has an infinite loop that waits forever until a button is pressed. Do not remove that part! The ESP32 is running an RTOS that needs to do some book keeping in the background. Without some delay somewhere you'll get watchdog timer errors. However, you can change the line to the following, to only wait a few milliseconds instead of forever. Tweak this number to get the frame rate you want, or to make a nice slideshow.

```c++
xQueueReceive(butonQueue, &message, pdMS_TO_TICKS(1));
```

If you can't get the framerate you want, and are doing a lot of rendering in pax-graphics, you can offload that to the second core for a free speed boost.

```c++
pax_enable_multicore(1);
```

If that still isn't fast enough, you should hop over to the [FPGA](../../fpga/) section, which has a faster parallel bus to the display.

As for what kind of animations to make, a great source of inspiration is demoscene videos. [Here is a page](https://seancode.com/demofx/) that has some implementations of a few of the classic effects, but there are plenty of other cool effects to be found all over the internet. Who's going to implement Nyan Cat, Bad Apple, old Windows screensavers, and more?

# RGB galore

The badge includes a kite of RGB LEDs, which you can do cool blinkenlights with. The API is pretty simple: First you need to enable the power gate to the LEDs, then you init it with the correct output pin, and then you send an array of PWM values.

```c++
#include "ws2812.h"

// enable power to the LEDs
gpio_set_direction(GPIO_SD_PWR, GPIO_MODE_OUTPUT);
gpio_set_level(GPIO_SD_PWR, 1);
// initialise them
ws2812_init(GPIO_LED_DATA);
// send data
uint8_t led_red[15] = {0, 0xFF, 0, 0, 0xFF, 0, 0, 0xFF, 0, 0, 0xFF, 0, 0, 0xFF, 0};
ws2812_send_data(led_red, sizeof(led_red));
```

As an example, [here](https://github.com/badgeteam/mch2022-firmware-esp32/blob/3a714f36a0ff8f999abb69475cb3c21152ab1403/main/main.c#L137-L191) is the kite animation that plays when you start the badge.

# Making sound

TODO: There isn't a nice API for this yet. You can steal some [code from the launcher](https://github.com/badgeteam/mch2022-firmware-esp32/blob/master/main/audio.c) maybe.

# Using sensors

TODO: Make some nice example with the [BNO055 component](https://github.com/Nicolai-Electronics/esp32-component-i2c-bno055)