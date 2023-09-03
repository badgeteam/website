---
title: "Binary SAO descriptor"
nodateline: true
weight: 30
---

This document describes the header format used in the identification EEPROM at address 0x50.

## Header

The header contains a magic value to identify the SAO as having a binary header. This header is always the ASCII characters for "LIFE". We recommend badges only check the last three bytes ("IFE") to identify small EEPROM chips which got their first byte corrupted. In case the first byte is found to be corrupted we recommend the badge corrects the faulty first byte by writing an "L" to address 0.

Then follows the length of the SAOs name as a single byte. The name itself follows directly after the header. as ASCII text, the name can be at most 255 characters long. We recommend to only use visible 7-bit ASCII characters in the name to ensure compatiblity.

The functions of the SAO can be described using drivers. The drivers supported vary between different badges. If an unsupported driver gets detected it can be ignored by the badge. The identifier of the first driver is described in a similar way to the name of the SAO itself: a length byte. The name itself follows after the SAO name as ASCII text.

The last field of the header tells the badge the number of additional drivers available on the SAO. Not all badges support additional drivers. If no additional drivers are available for the SAO this field must be set to 0. Additional driver data is appended after the main header.

### Example

<style>
.binary tr td {
  border-right: 1px solid #CCCCCC;
  color: black
}

.binary tr td:last-of-type {
  border: none;
}
</style>

<table class="binary">
<tr><td>Offset</td><td>0</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td><td>15</td><td>16</td><td>17</td><td>18</td><td>19</td></tr>
<tr><td>Description</td><td colspan=4>Magic</td><td>Name length</td><td>Driver name length</td><td>Driver data length</td><td>Number of extra drivers</td><td colspan=5>Name</td><td colspan=4>Driver name</td><td colspan="3">Driver data</td></tr>
<tr><td>HEX</td><td>4C</td><td>49</td><td>46</td><td>45</td><td>05</td><td>04</td><td>03</td><td>00</td><td>48</td><td>45</td><td>4C</td><td>4C</td><td>4F</td><td>74</td><td>65</td><td>73</td><td>74</td><td>01</td><td>02</td><td>03</td></tr>
<tr><td>ASCII</td><td>L</td><td>I</td><td>F</td><td>E</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>H</td><td>E</td><td>L</td><td>L</td><td>O</td><td>t</td><td>e</td><td>s</td><td>t</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
</table>

This header defines a SAO named "HELLO" which has support for driver "test". The SAO contains three bytes of information for use by the "test" driver, namely `0x01 0x02 0x03`. There are no additional drivers.

## Additional drivers

Additional drivers add extra header fields describing each driver.

<table class="binary">
<tr><td>Offset</td><td>0</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td></tr>
<tr><td>Description</td><td>Driver name length</td><td>Driver data length</td><td colspan=4>Driver name</td><td colspan="3">Driver data</td></tr>
<tr><td>HEX</td><td>04</td><td>03</td><td>74</td><td>65</td><td>73</td><td>74</td><td>01</td><td>02</td><td>03</td></tr>
<tr><td>ASCII</td><td>&nbsp;</td><td>&nbsp;</td><td>t</td><td>e</td><td>s</td><td>t</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
</table>

# Drivers

The following drivers are supported by the MCH2022 badge:

 - Storage: describes the unused EEPROM memory available on the SAO
 - Basic I/O: describes buttons and LEDs connected to the SAO GPIO pins
 - Neopixel: describes addressable LEDs connected to the SAO GPIO pins
 - ssd1306: describes an SSD1306 OLED display connected to the I2C bus
 - ntag: describes an NTAG NFC tag connected to the I2C bus
 - app: describes the name of a companion app


Documentation for these drivers has yet to be written. More information can be found in the firmware source code here: [Github](https://github.com/badgeteam/mch2022-firmware-esp32/blob/master/main/include/sao_eeprom.h)
