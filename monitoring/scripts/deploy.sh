#!/usr/bin/env bash

# crontab:
# 0 0 * * * cd ~/apps/monitoring && scripts/deploy.sh prod

set -ex

PROM_ENV="${1:-local}"

docker-compose build --build-arg PROM_ENV=${PROM_ENV}

if [[ "${PROM_ENV}" != "prod" ]]; then
    docker-compose down
    docker network create audius_dev || true
fi
docker-compose up -d
