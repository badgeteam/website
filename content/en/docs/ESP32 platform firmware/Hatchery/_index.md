---
title: Hatchery
nodateline: true
weight: 2
---

## [Badge.team](https://hatchery.badge.team)

The hatchery lives at [hatchery.badge.team](https://hatchery.badge.team) and is a repository of apps for use on your badge.

### Registration

[Registration is simple](https://hatchery.badge.team/register), email can be whatever, for example test@test.com, it is only used for password resets.

### App model

Apps are folders with as a minimal requirement a <code>__init__.py</code> file.

Hatchery will add an empty version of that file for you.

#### main()

This is what should be run after <code>import</code> by the  [[SHA2017Badge/Launcher|Launcher]].

#### on_boot.py

This is what will be started on boot (if present) like so <code>from app import on_boot</code>

You can use this to run TSR apps (take a look at the flashlight app for an example of this..

#### metadata.json

Unless you upload or create such a file, Hatchery will generate one . .

This contains at-minimum the description of the app and weather or not it should be shown in the [[SHA2017Badge/Launcher|Launcher]].

[SHA2017Badge/Launcher]: https://github.com/badgeteam/ESP32-platform-firmware/blob/master/firmware/python_modules/shared/dashboard/launcher.py

### Hatching eggs

Installation of apps on the badge is done with [[github/woezel|woezel]] via REPL or with help of a graphical [[installer]] on the badge.

### API
There's an api available, used by [[github/woezel|woezel]] ([[github/woezel-examples|examples]] / [[github/installers|more examples]]):
```
/eggs/get/[app]/json       - get json data for a the egg named [app]
/eggs/list/json            - a list of all eggs with name, slug, description, revision
/eggs/search/[words]/json  - json data for search query [words]
/eggs/categories/json      - json list of categories
/eggs/category/[cat]/json  - json data for category [cat]
```

Since the Badge.team merger there are now baskets for different badges
```
/basket/[badge]/list/json           - a list of all eggs for specific [badge]
/basket/[badge]/search/json         - [badge] specific search for [words]
/basket/[badge]/category/[cat]/json - json data for category [cat] on [badge]
```

You can play around with this API here at: https://hatchery.badge.team/api

[github/woezel]: https://github.com/badgeteam/ESP32-platform-firmware/blob/master/firmware/python_modules/shared/woezel.py
[github/woezel-examples]: https://github.com/search?q=repo%3Abadgeteam%2FESP32-platform-firmware+%2Fimport+%28%3F%3A%5Cw%2B%2C+%3F%29%2Bwoezel%2F&type=code
[github/installers]: https://github.com/search?q=repo%3Abadgeteam%2FESP32-platform-firmware%20installer&type=code

### Code

[Hatchery on Github](https://github.com/badgeteam/Hatchery)
