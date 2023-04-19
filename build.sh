#!/usr/bin/env bash

set -e
set -u

git submodule update --init --recursive
npm install
cd themes/docsy
npm install
cd ../..
export HUGO_ENV="production"
hugo --gc --minify
