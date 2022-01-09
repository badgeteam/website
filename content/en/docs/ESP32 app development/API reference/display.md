---
title: "Display"
nodateline: true
weight: 1
---

The *display* module is available on platforms which have the *framebuffer* driver enabled. It allows for controlling the display of your device.

**Available on:** &nbsp;&nbsp; ✅ [CampZone 2020](/badges/campzone-2020/) &nbsp;&nbsp; ✅ [Disobey 2020](/badges/disobey-2020/) &nbsp;&nbsp; ✅ [CampZone 2019](/badges/campzone-2019/) &nbsp;&nbsp; ✅ [HackerHotel 2019](/badges/hackerhotel-2019/) 
<br> ✅ [Disobey 2019](/badges/disobey-2019/) &nbsp;&nbsp; ✅ [SHA2017](/badges/sha2017/)


# Reference
| Command          | Parameters                                                            | Description                                                                                                                                                                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| flush            | \[flags\]                                                             | Flush the contents of the framebuffer to the display. Optionally you may provide flags (see the table down below)                                                                                                                                                                                      |
| size             | \[window\]                                                            | Get the size (width, height) of the framebuffer or a window as a tuple                                                                                                                                                                                                                                 |
| width            | \[window\]                                                            | Get the width of the framebuffer or a window as an integer                                                                                                                                                                                                                                             |
| height           | \[window\]                                                            | Get the height of the framebuffer or a window as an integer                                                                                                                                                                                                                                            |
| orientation      | \[window\], \[angle\]                                                 | Get or set the orientation of the framebuffer or a window                                                                                                                                                                                                                                              |
| getPixel         | \[window\], x, y                                                      | Get the color of a pixel in the framebuffer or a window                                                                                                                                                                                                                                                |
| drawRaw          | \[window\], x, y, width, height, data                                 | Copy a raw bytes buffer directly to the framebuffer or the current frame of a window. The length of the bytes buffer must match the formula width\*height\*(bitsPerPixel//8). This is a direct copy: color format (bitsPerPixel) must match the specific display of the badge this command is used on. |
| drawPixel        | \[window\], x, y, color                                               | Draw a pixel in the framebuffer or a window                                                                                                                                                                                                                                                            |
| drawFill         | \[window\], color                                                     | Fill the framebuffer or a window                                                                                                                                                                                                                                                                       |
| drawLine         | \[window\], x0, y0, x1, y1, color                                     | Draw a line from (x0, y0) to (x1, y1)                                                                                                                                                                                                                                                                  |
| drawTri(angle)   | \[window\], x0, y0, x1, y1, x2, y2                                    | Draws a filled triangle                                                                                                                                                                                                                                                                                |
| drawRect         | \[window\], x, y, width, height, filled, color                        | Draw a rectangle at (x, y) with size (width, height). Set the filled parameter to False to draw only the border, or set it to True to draw a filled rectangle.                                                                                                                                         |
| drawQuad*        | \[window\], x0, y0, x1, y1, x2, y2, x3, y3                            | Draws a four-pointed shape between (x0, y0), (x1, y1), (x2, y2) and (x3, y3), always filled                                                                                                                                                                                                            |
| drawCircle       | \[window\], x0, y0, radius, a0, a1, fill, color                       | Draw a circle with center point (x0, y0) with the provided radius from angle a0 to angle a1, optionally filled (boolean)                                                                                                                                                                               |
| drawText         | \[window\], x, y, text, \[color\], \[font\], \[x-scale\], \[y-scale\] | Draw text at (x, y) with a certain color and font. Can be scaled (drawn with rects instead of pixels) in both the x and y direction                                                                                                                                                                    |
| drawPng          | \[window\], x, y, \[data or filename\]                                | Draw a PNG image at (x, y) from either a bytes buffer or a file                                                                                                                                                                                                                                        |
| getTextWidth     | text, \[font\]                                                        | Get the width a string would take if drawn with a certain font                                                                                                                                                                                                                                         |
| getTextHeight    | text, \[font\]                                                        | Get the height a string would take if drawn with a certain font                                                                                                                                                                                                                                        |
| pngInfo          | \[data or filename\]                                                  | Get information about a PNG image                                                                                                                                                                                                                                                                      |
| windowCreate     | name, width, height                                                   |                                                                                                                                                                                                                                                                                                        |
| windowRemove     | name                                                                  |                                                                                                                                                                                                                                                                                                        |
| windowMove       | name, x, y                                                            |                                                                                                                                                                                                                                                                                                        |
| windowResize     | name, width, height                                                   |                                                                                                                                                                                                                                                                                                        |
| windowVisibility | name, \[visible\]                                                     |                                                                                                                                                                                                                                                                                                        |
| windowShow       | name                                                                  |                                                                                                                                                                                                                                                                                                        |
| windowHide       | name                                                                  |                                                                                                                                                                                                                                                                                                        |
| windowFocus      | name                                                                  |                                                                                                                                                                                                                                                                                                        |
| windowList       | \-                                                                    |                                                                                                                                                                                                                                                                                                        |
| translate*       | \[window\], x, y                                                      | Move the canvas of the window by (x, y)                                                                                                                                                                                                                                                                |
| rotate*          | \[window\], angle                                                     | Rotate the canvas of the window by an angle (in randians)                                                                                                                                                                                                                                              |
| scale*           | \[window\], x, y                                                      | Scale the canvas of the window by (x, y)                                                                                                                                                                                                                                                               |
| pushMatrix*      | \[window\]                                                            | Save the current transformation for later, may be more than one                                                                                                                                                                                                                                        |
| popMatrix*       | \[window\]                                                            | Restore the transformation pushed earlier, may be more than one                                                                                                                                                                                                                                        |
| clearMatrix*     | \[window\], \[keep-stack\]                                            | Clears the current matrix, and also the matrix stack unless keep-stack is true                                                                                                                                                                                                                         |
| getMatrix*       | \[window\]                                                            | Returns an array representing the current matrix for the window                                                                                                                                                                                                                                        |
| setMatrix*       | \[window\], \[matrix\]                                                | Sets the current matrix to the array representing it                                                                                                                                                                                                                                                   |
| matrixSize*      | \[window\]                                                            | Returns the current size of the matrix stack for the window                                                                                                                                                                                                                                            |

\* This command is only available if you run a firmware with graphics acceleration, and the respective part enabled in the component config under Driver: framebuffer.
Currently, badges have these features disabled by default.

| flag               | platform                      | description                                   |
| ------------------ | ----------------------------- | --------------------------------------------- |
| FLAG_FORCE         | All                           | Force flushing the entire screen.             |
| FLAG_FULL          | All                           | Force flushing the entire screen.             |
| FLAG_LUT_GREYSCALE | All with greyscale: SHA2017   | Simulate greyscale.                           |
| FLAG_LUT_NORMAL    | All with e-ink                | Normal speed flush.                           |
| FLAG_LUT_FAST      | All with e-ink                | Faster flush.                                 |
| FLAG_LUT_FASTEST   | All with e-ink                | Much faster flush.                            |

# Color representation
Colors are always represented in 24-bit from within Python, in the 0xRRGGBB format. This matches HTML/CSS colors which are #RRGGBB as well.

Devices with a smaller colorspace will not actually store the exact color information provided.
For displays with a color depth of less than 24-bit the display driver will automatically mix down the colors to the available color depth.
This means that even if you have a black and white display 0x000000 is black and 0xFFFFFF is white.

# Examples

## Setting one pixel

```
import display
x = 2
y = 3
display.drawPixel(x, y, 0x00FF00)  # Set one pixel to 100% green
display.flush() # Write the contents of the buffer to the display
```

## Drawing a line

```
import display
display.drawFill(0x000000) # Fill the screen with black
display.drawLine(10, 10, 20, 20, 0xFFFFFF) # Draw a white line from (10,10) to (20,20)
display.flush() # Write the contents of the buffer to the display
```

## Drawing text
```
import display
display.drawFill(0x000000) # Fill the screen with black
display.drawText(10, 10, "Hello world!", 0xFFFFFF, "permanentmarker22") # Draw the text "Hello world!" at (10,10) in white with the PermanentMarker font with size 22
display.flush() # Write the contents of the buffer to the display
```

## Drawing a rectangle
```
import display
display.drawFill(0x000000) # Fill the screen with black
display.drawRect(10, 10, 10, 10, False, 0xFFFFFF) # Draw the border of a 10x10 rectangle at (10,10) in white
display.drawRect(30, 30, 10, 10, True, 0xFFFFFF) # Draw a filled 10x10 rectangle at (30,30) in white
display.flush() # Write the contents of the buffer to the display
```

## Spinning a box
Note: as described earlier, matrix transformations are not enabled in the firmware by default
```
import display, math
# Note: radians are an angle unit where PI (math.pi) is half a rotation
display.clearMatrix() # Clear the matrix stack, just in case it wasn't already
display.translate(display.width() / 2, display.height() / 2) # Go to the middle of the screen
    # Everything is now offset as if the middle of the screen is X/Y (0, 0)
while True:
    display.drawFill(0xffffff) # Fill the screen with white
    display.rotate(math.pi * 0.1) # This will continually rotate the screen by a small amount
    display.drawRect(-20, -20, 40, 40, True, 0x000000) # Simply draw a rectangle, which will then spin
    display.flush() # Flush, show everything
```

## Spinning text
Note: as described earlier, matrix transformations are not enabled in the firmware by default

Similarly to spinning a box, you can also spin text this way.
```
import display, math
# Note: radians are an angle unit where PI (math.pi) is half a rotation
text = "Well hello there!" # Whatever you want to show
font = "7x5" # Pick a font
scale = 2 # You can scale text, too!
display.clearMatrix() # Clear the matrix stack, just in case it wasn't already
display.translate(display.width() / 2, display.height() / 2) # Go to the middle of the screen
    # Everything is now offset as if the middle of the screen is X/Y (0, 0)
while True:
    display.drawFill(0xffffff) # Fill the screen with white
    display.rotate(math.pi * 0.1) # This will continually rotate the screen by a small amount
    textWidth = display.getTextWidth(text, font) # Get the size so we can center the text
    textHeight = display.getTextHeight(text, font)
    display.pushMatrix() # Save the transformation for later
    display.scale(scale, scale) # Scale the text
    display.translate(-textWidth / 2, -textHeight / 2) # Move the canvas so the text is centered
        # It is important you scale first, then translate
    display.drawText(0, 0, text, 0x000000, font) # Spinny texts
    display.popMatrix() # Restore the transformation
    display.flush() # Flush, show everything
```

## More complex graphics
Note: as described earlier, matrix transformations are not enabled in the firmware by default

Now you've spun a box and some text, what about something more complicated?<br>
Let's say we draw a boat on a wave!

First, we draw the boat using some shapes:
```
import display, math

def drawBoat():
    display.pushMatrix()
    drawBoatBottom(0x000000)
    display.translate(-4, 0) # Move just a little so the mast lines up nicely
    drawBoatMast(0x000000, 0x000000)
    display.popMatrix()

def drawBoatMast(mastColor, flagColor):
    # The points drawn, by place:
    # 0--1
    # |  |
    # |  6
    # |  |\
    # |  5-4
    # |  |
    # 3--2
    x0, y0 = 0, -23
    x1, y1 = 3, -23
    x2, y2 = 3, 0
    x3, y3 = 0, 0
    x4, y4 = 12, -10
    x5, y5 = 3, -10
    x6, y6 = 3, -20
    display.drawQuad(x0, y0, x1, y1, x2, y2, x3, y3, mastColor) # This is the mast: points 0, 1, 2, 3
    display.drawTri(x4, y4, x5, y5, x6, y6, flagColor) # This is the flag: points 4, 5, 6

def drawBoatBottom(color):
    # The points drawn, by place:
    # 0--------1
    #  \      /
    #   3----2
    x0, y0 = -20, 0
    x1, y1 = 20, 0
    x2, y2 = 16, 8
    x3, y3 = -16, 8
    display.drawQuad(x0, y0, x1, y1, x2, y2, x3, y3, color)
```
Now, to test your boat drawing action:
```
import display, math

# Put the boat drawing functions here

display.clearMatrix() # Don't forget
display.translate(30, 30) # Move to where you want to draw the boat
display.drawFill(0xffffff) # Clear the screen once more
drawBoat() # Draw the boat of course
display.flush() # Flush display; boat is now visible
```
Then, we'll draw a wave and a sun:
```
import display, math

def drawSun(color): # Draws the sun with a circle and some lines
    display.pushMatrix()
    display.translate(-3, -3 - display.height()) # This is where the sun will orbit around
        # We do - display.height() here because we set the origin to be at the bottom of the screen earlier
    display.drawCircle(0, 0, 30, 0, 360, True, color) # The sun
    display.rotate(sunOffset)
    for i in range(20): # Draw lines as the sun's rays
        display.rotate(math.pi / 10)
        display.drawLine(0, 35, 0, 45, color)
    display.popMatrix()

# For good measure.
display.clearMatrix()

display.translate(0, display.height())

sunOffset = 0
offset = 0
boatX = display.width() / 6
boatAngle = 0
boatY = 0

while True:
    display.drawFill(0xffffff)
    drawSun(0x000000) # Draw the sun
    for i in range(display.width()): # Draw the waves by plotting points
        wave = math.sin((i + offset) * math.pi / 35) * 8 - 35
        display.drawPixel(i, wave, 0x000000)
        if i & 1:
            for j in range(round(wave - 1) | 1, 0, 2):
                display.drawPixel(i, j + ((i >> 1) & 1) + 1, 0x000000)
    offset += 8 # Move the waves over by a bit
    sunOffset += math.pi * 0.025 # Spin the sun by a bit
    display.flush()
```
Finally, you can draw the boat on the wave, by adding some code:
```
while True:
    display.drawFill(0xffffff)
    drawSun(0x000000)
    for i in range(display.width()):
        wave = math.sin((i + offset) * math.pi / 35) * 8 - 35
        display.drawPixel(i, wave, 0x000000)
        if i & 1:
            for j in range(round(wave - 1) | 1, 0, 2):
                display.drawPixel(i, j + ((i >> 1) & 1) + 1, 0x000000)
    # vvvv HERE vvvv
    display.pushMatrix() # Save the transformation, we're going to mess with it
    waterLevelBeforeBoat = math.sin((boatX + 2 + offset) * math.pi / 35) * 8 - 35
    boatY = math.sin((boatX + offset) * math.pi / 35) * 8 - 35
        # Calculate the two water levels, one at and one before the boat
        # By doing this, we know how and where to position the boat
    boatAngle = math.atan2(waterLevelBeforeBoat - boatY, 2) # Using atan2 to find the angle required to rock the boat with the wave
    display.translate(boatX, boatY - 6) # Now, position the boat
    display.rotate(boatAngle)
    drawBoat() # And draw the boat
    display.popMatrix() # Undo our changes to the transformation
    # ^^^^ HERE ^^^^
    offset += 8
    sunOffset += math.pi * 0.025
    display.flush()
```
The source code for the boat can be found here:
[gist: boat.py](https://gist.github.com/robotman2412/121ebe82a74dbca13d3c5f3d1eddb1d7)

# Known problems
 - Rotation of the contents of windows does not work correctly in combination with rotation of the screen itself
 - There is no method available to list the fonts available on your platform
 - There is no method for providing a custom font
 - There is no anti-aliassing support
