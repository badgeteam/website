#!/usr/bin/env bash

set -e
set -u

git submodule update --init --recursive

npm install

export HUGO_ENV="production"
hugo --gc
