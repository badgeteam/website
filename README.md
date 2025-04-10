[![Build and deployment](https://github.com/badgeteam/website/actions/workflows/cd.yml/badge.svg?branch=master)](https://github.com/badgeteam/website/actions/workflows/cd.yml)

# Badge.Team website

You can find our website and the documentation website at [badge.team/docs](https://badge.team/docs/). This repository contains the Markdown files with content, the theme files and the configuration needed to build our website using Hugo.

# Development
If you want to test your changes locally then you first have to install [Hugo](https://gohugo.io/getting-started/installing/).

After you've installed Hugo building the website is as easy as cloning the repository and running ```hugo``` in the repository root.

Hugo can also host a development server, you can use this feature by running ```hugo server``` in the root of the repository. The development server will then be reachable at http://localhost:1313

```bash
git clone https://github.com/badgeteam/website.git
cd website
./dev_server.sh
```
