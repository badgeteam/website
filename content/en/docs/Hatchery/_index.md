---
title: Hatchery
nodateline: true
weight: 2
---

The hatchery can be found at [hatchery.badge.team](https://hatchery.badge.team) and is a repository of apps for use on your badge.

For the MCH2022 badge a separate hatchery was created which can be found at [mch2022.badge.team](https://mch2022.badge.team). The two hatcheries will eventually be merged into one.

## Registration

[Registration is simple](https://hatchery.badge.team/register), email can be whatever, for example test@test.com, it is only used for password resets.

## App model

Apps are folders with as a minimal requirement a `__init__.py` file.

Hatchery will add an empty version of that file for you.

The badges get some extra information about your app by reading a file named `metadata.json`. Unless you upload or create such a file, Hatchery will generate one.

This contains at-minimum the description of the app and weather or not it should be shown in the launcher.

```
{
  "name": "example",
  "description": "My awesome example app",
  "category": "hacking",
  "author": "Henk de Vries",
  "revision": 1
}
```

### Code

[Hatchery on Github](https://github.com/badgeteam/Hatchery)
