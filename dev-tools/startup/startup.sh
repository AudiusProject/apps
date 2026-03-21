#!/usr/bin/env bash

# NOTE: This script is meant to be used from within docker containers

name=$(nslookup $(hostname -i) | grep -o "\(discovery-provider\|identity-service\)-[0-9]\+")
replica=$(echo $name | grep -o "[0-9]\+")

if [[ -f "/tmp/dev-tools/startup/$name.env" ]]; then
  set -o allexport
  echo "Loading $name.env"
  . "/tmp/dev-tools/startup/$name.env"
  set +o allexport
fi

if [[ -f "/tmp/dev-tools/startup/${name%-*}.env" ]]; then
  set -o allexport
  echo "Loading ${name%-*}.env"
  . "/tmp/dev-tools/startup/${name%-*}.env"
  set +o allexport
fi

if [[ -f "/tmp/dev-tools/startup/$name.sh" ]]; then
  echo "Loading $name.sh"
  . "/tmp/dev-tools/startup/$name.sh"
fi

# -z "$startup_done" exists to allow name-replica.sh be the only script that is run
if [[ -z "$startup_done" ]] && [[ -f "/tmp/dev-tools/startup/${name%-*}.sh" ]]; then
  echo "Loading ${name%-*}.sh"
  . "/tmp/dev-tools/startup/${name%-*}.sh"
fi
