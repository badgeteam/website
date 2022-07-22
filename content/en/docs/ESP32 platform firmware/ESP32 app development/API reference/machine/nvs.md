---
title: "Non Volatile Storage"
nodateline: true
weight: 1
---

This page describes the Non-Volatile-Storage (NVS) functions of the machine API. This NVS is used to store settings such as WiFi credentials and your nickname.

The NVS storage is a function of the ESP-IDF which allows for settings to be stored in a special partition on the flash of the ESP32 and is ment for small quantities of data.
If you want to store large(er) amounts of data we suggest you use the filesystem functions of MicroPython to store your data on the FAT partition instead.

# Reference

| Command       | Parameters                     | Description                                |
|---------------|--------------------------------|--------------------------------------------|
| nvs_set_u8    | \[space\], \[key\], \[value\]  | Store an unsigned 8-bit value              |
| nvs_get_u8    | \[space\], \[key\]             | Retrieve an unsigned 8-bit value           |
| nvs_set_u16   | \[space\], \[key\[, \[value\]  | Store an unsigned 16-bit value             |
| nvs_get_u16   | \[space\], \[key\]             | Retreive an unsigned 16-bit value          |
| nvs_setint    | \[space\], \[key\], \[value\]  | Store a signed integer value               | 
| nvs_getint    | \[space\], \[key\]             | Retreive a signed integer value            |
| nvs_setstr    | \[space\], \[key\], \[value\]  | Store a string                             |
| nvs_getstr    | \[space\], \[key\]             | Retreive a string                          |
| nvs_erase     | \[space\], \[key\]             | Remove an entry from the NVS               |
| nvs_erase_all | \[space\]                      | Remove all entries in a space from the NVS |

# NVS settings used by the firmware

The following list describes the settings stored by the BADGE.TEAM firmware.

| Space  | Key         | Type    | Function                               |
|--------|-------------|---------|----------------------------------------|
| owner  | nick        | string  | The nickname of the owner of the badge |
| system | default_app | string  | The app/egg launched on powerup        |

# NVS settings for your app

Please use the *slug* name of your app as the name of the space used to store your settings.

# Examples

## Nickname

### Reading the nickname

```
import nvs
nickname = nvs.nvs_getstr("owner", "nickname")
print("Your nickname is '{}'!".format(nickname))
```

### Setting the nickname

```
import nvs
nvs.nvs_setstr("owner", "nickname", "badge.team")
```

