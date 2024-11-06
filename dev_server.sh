#!/usr/bin/env bash

set -e
set -u
bash build.sh
hugo server --disableFastRender
