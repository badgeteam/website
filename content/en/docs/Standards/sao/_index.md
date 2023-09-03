---
title: "SAO: Standardized Add-On"
nodateline: true
weight: 30
---

The Standardized Add-On connector is a standardized way of connecting boards with additional functionality to badges,
allowing for add-on boards to work with a variety of badges and for the users of badges to enjoy a variety of add-ons.

## History

This standard started out as a bit of a joke, with the Shitty Add-On standard published in a [hackaday.io project](https://hackaday.io/project/52950-shitty-add-ons) by Brian Benchoff and was later revised
in the [Shitty Add-On v1.69bis](https://hackaday.io/project/52950-shitty-add-ons/log/159806-introducing-the-shitty-add-on-v169bis-standard) standard (also by Brian Benchoff).

While the SAO 1.69bis standard defines the electrical characteristics of the addons it does not provide any usable method for identifying what addon has been connected.
The solution for this shortfall can be found in the [badge addon id](https://github.com/urish/badge-addon-id) standard by Uri Shaked.
The identification method referred to by the v1.69bis standard is [this unusable identification data structure](https://github.com/ANDnXOR/sao-reference-designs) described by AND!XOR.

### Our new standard

Badges are serious fun and serious fun of course needs to be constrained by serious specifications. Because of this we're introducing the Standardized Add-On v4.2terbo standard. It's guaranteed to improve compatibility and it might also somehow be faster, who knows?

## SAO

### The connector

A SAO is connected to the badge via a two row, three columns (2x3) 2.54mm (or 0.1" for those refusing practical units) pitched female socket which mates with the standard 2x3 male header that most hackers already have in their toolboxes.
If possible a keyed connector should be used on the badge, which will in combination with a shrouded header on the addon board prevent users from plugging in the addon in a wrong orientation or position.

| Pin | Function   | Notes                                                                                                                            |
|-----|------------|----------------------------------------------------------------------------------------------------------------------------------|
| 1   | 3.3v power | Provides power to the add-on, do not feed back power into a connected badge                                                      |
| 2   | GND        | Reference                                                                                                                        |
| 3   | SDA        | I2C data                                                                                                                         |
| 4   | SCL        | I2C clock                                                                                                                        |
| 5   | GPIO1      | General purpose in- or output pin 1. Also used as data pin for connected WS2812 (Neopixel) and APA102 (DotStar) addressable LEDs |
| 6   | GPIO2      | General purpose in- or output pin 2. Also used as clock pin for APA102 (DotStar) addressable LEDs and as interrupt input         |

### Identification

To allow for automatic identification an addon can provide an EEPROM at I2C address 0x50.

Both small (8-bit address length) and bigger (32-bit address length) EEPROMS can be used,
but keep in mind that people can accidently overwrite data in small eeproms because these devices interpret a read from a 16-bit address as a write command.
Because of this enabling the write-protect feature of smaller identification EEPROMs is strongly recommended.

### Safe identification

First attempt an 8-bit read of 4 bytes starting at memory address 0x00 of the EEPROM at I2C address 0x50. The first byte is to be ignored and the second, third and fourth bytes are to be compared against the header identification table.
If no match is found proceed with a 16-bit read of 4 bytes starting at address 0x00 of the EEPROM at I2C address 0x50, again compare the second, third and fourth bytes are to be compared against the header identification table.
If again no match is found the SAO is to be determined unformatted and further automatic communication must be avoided. Optionally the user may be prompted to format the addon.\

Ignoring the first byte read from the EEPROM is done to allow for identifying addons for which the first EEPROM byte was corrupted by an accidental write caused by a 16-bit read command sent to an EEPROM using 8-bit addresses.

### Header identifiers

| 1 | 2 | 3 | 4 | Description                 | Documentation                      |
|---|---|---|---|-----------------------------|------------------------------------|
| L | I | F | E | Binary descriptor           | [On this site](binary_descriptor) |
| J | S | O | N | JSON text descriptor        |                                    |
| T | E | A | M | Reserved for Badge.team use |                                    |

