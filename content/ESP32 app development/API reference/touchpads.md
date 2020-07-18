---
title: "Touchpads"
nodateline: true
weight: 50
---


The *touchpads* API allows you to call functions when someone presses a touchpad.
{{% notice tip %}}
**Available on:** &nbsp;&nbsp; ✅ [CampZone 2020](/badges/campzone-2020/)
{{% /notice %}}

# Example

```python
import touchpads

def on_left(is_pressed):
    print('Left button: ' + is_pressed)

def on_ok(is_pressed):
    print('OK button: ' + is_pressed)

touchpads.on(touchpads.LEFT, on_left)
touchpads.on(touchpads.OK, on_ok)
```

# Reference

| Function            | Parameters                 | Returns | Description                                                                      |
| ------------------ | -------------------------- | ------- | -------------------------------------------------------------------------------- |
| on | touchpad, callback          | - | Set a callback that gets called whenever the given touchpad touch state changes. First argument to this function is the pressed state. Touchpad can be touchpads.LEFT, RIGHT, HOME, CANCEL, or OK.                                                    |
| off | touchpad          | - | Remove a previously set callback.                                                   |
