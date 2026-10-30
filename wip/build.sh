#!/bin/sh
# Builds the static site: the same page at /, /us/, /uk/, /ie/, /ca/, /au/, /nz/ and /sa/.
set -e
rm -rf dist && mkdir -p dist
for d in "" us uk ie ca au nz sa; do mkdir -p "dist/$d"; cp src/index.html "dist/$d/index.html"; done
cp src/house3d.js dist/
mkdir -p dist/fonts
cp src/fonts/*.woff2 dist/fonts/
cp src/_headers dist/ 2>/dev/null || true
mkdir -p dist/premium
for d in us uk ie ca au nz sa; do
  mkdir -p "dist/premium/$d"
  cp src/premium.html "dist/premium/$d/index.html"
done
cp src/premium-assets/*.woff2 src/premium-assets/*.webp src/premium-assets/*.txt dist/premium/
echo built
