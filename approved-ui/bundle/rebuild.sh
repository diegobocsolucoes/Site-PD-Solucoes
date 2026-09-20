#!/usr/bin/env sh
set -eu

DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$DIR"

cat PD_UI_FONTES_MIN.tar.bz2.part-*.b64 | tr -d '\n' | base64 -d > PD_UI_FONTES_MIN.tar.bz2

printf '%s  %s\n' \
  '58036ab81b2203c6bc79253c60a344c48f7de803a83cb3551b6b7ef34fde9cc2' \
  'PD_UI_FONTES_MIN.tar.bz2' | sha256sum -c -

rm -rf ../sources-expanded
mkdir -p ../sources-expanded
tar -xjf PD_UI_FONTES_MIN.tar.bz2 -C ../sources-expanded

echo "Fontes reconstruídas em approved-ui/sources-expanded/"
