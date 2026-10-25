#!/bin/sh
# Builds the static site: the same page at /, /us/, /uk/, /ie/, /ca/, /au/, /nz/ and /sa/.
set -e
rm -rf dist && mkdir -p dist
for d in "" us uk ie ca au nz sa; do mkdir -p "dist/$d"; cp src/index.html "dist/$d/index.html"; done
cp src/house3d.js dist/
cp src/_headers dist/ 2>/dev/null || true
echo built
