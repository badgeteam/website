---
title: "Appconfig"
nodateline: true
weight: 50
---


The *appconfig* API apps to register their user-configurable settings. By using this API, app settings are shown in the Settings page of the WebUSB website for supported badges.

**Available on:** &nbsp;&nbsp; ✅ [CampZone 2020](/badges/campzone-2020/)


# Example

```python
import appconfig

settings = appconfig.get('my_app_slug_name', {'option_1': 'defaultvalue', 'awesomeness': 1337, 'option_3': [1,2,3]})
mynumber = settings['awesomeness']
```

# Reference

| Function            | Parameters                 | Returns | Description                                                                      |
| ------------------ | -------------------------- | ------- | -------------------------------------------------------------------------------- |
| get               | app_slug_name, default_options  | Object | Gets the user-set options for the app with the given name. If no configuration exists yet, returns the object passed into default_options.                                                     |
