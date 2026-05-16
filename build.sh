#!/usr/bin/env bash
set -e
ENV=${1:-dev}
if [ "$ENV" != "dev" ] && [ "$ENV" != "prod" ]; then
  echo "Usage: bash build.sh [dev|prod]" && exit 1
fi
cp "config/$ENV.js" public/config.js
echo "Environnement '$ENV' configuré (public/config.js mis à jour)"
