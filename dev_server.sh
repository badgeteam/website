#!/usr/bin/env bash

set -e
set -u
git submodule update --init --recursive
npm install
hugo server --disableFastRender
