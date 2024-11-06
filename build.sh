#!/usr/bin/env bash

set -e
set -u

npm install
export HUGO_ENV="production"
hugo --gc --minify
