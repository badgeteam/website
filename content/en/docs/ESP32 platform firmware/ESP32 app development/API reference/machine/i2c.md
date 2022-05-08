---
title: "The I2C bus"
nodateline: true
weight: 1
---

The *machine* API for I2C allows you to control the system I2C bus of your badge, the I2C bus exposed on the SAO, Grove, Qwiic or other extension ports as well as a second I2C bus on any two broken out GPIOs of your choice.

The ESP32 has two I2C controllers, each of which can be set to master or slave mode. Most of our badges use one of these I2C controllers for their internal I2C bus.
You can take control over this system I2C bus using the machine API without directly causing issues but be adviced that doing this might possibly disrupt communications with one or more system components like the touch-button controller IC or the display.

Alternatively you can use the I2C API to define a secondary I2C bus on any two broken out GPIO pins.



# Direct I2C access

The firmware contains a second API for working with the system I2C bus, allowing you to directly call some ESP-IDF I2C functions from within MicroPython.

(to-do)

# Using the MicroPython *machine.I2C* API

While the directly exposed functions do already allow you to control i2c devices it is also possible to use the MicroPython I2C API on the same bus, simply by creating the bus using the exact settings used by the firmware itself.

The following snippet redefines ```i2c``` to be the MicroPython variant of the API instead of our direct functions. This snippet should work on all badges since it automatically uses the right pins for SDA and SCL as well as the correct bus speed for the board you are using.

```
import i2c, machine
i2c = machine.I2C(sda=machine.Pin(i2c.GPIO_SDA), scl=machine.Pin(i2c.GPIO_CLK), freq=i2c.SPEED)
```

If your board does not have a system I2C bus or if you want to use separate GPIOs for connecting your I2C device then you can also define a custom I2C interface on pins you choose. Keep in mind that the ESP32 can handle up to two I2C busses at once so if the firmare itself uses one then you can create only one custom i2c bus interface.

```
import machine
my_i2c_interface = machine.I2C(sda=machine.Pin(22), scl=machine.Pin(21), freq=100000)
```
