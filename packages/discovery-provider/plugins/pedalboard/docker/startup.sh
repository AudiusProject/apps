#!/usr/bin/env sh

# NOTE: This script is meant to be used from within docker containers

# Get the replica number from the host name
export replica=$(nslookup $(hostname -i) | sed -n "s/^.*audius-[A-z\-]*\([0-9]\)\+.*$/\1/p")

# If non-replicated, default to 1 (for eg verified-notifications)
if [ -z "$replica" ]; then
  replica=1
fi

# Get the relevant environment variables for that host
if [[ "$audius_db_url" == "" ]]; then
    export audius_db_url="postgresql+psycopg2://postgres:postgres@db:5432/discovery_provider_${replica}"
    export audius_db_url_read_replica="postgresql+psycopg2://postgres:postgres@db:5432/discovery_provider_${replica}"
fi

if [[ "$audius_redis_url" == "" ]]; then
    export audius_redis_url="redis://audius-discovery-provider-redis-${replica}:6379/00"
fi

export audius_discprov_url="http://audius-discovery-provider-${replica}"

export audius_delegate_owner_wallet=$(printenv "DP${replica}_DELEGATE_OWNER_ADDRESS")
export audius_delegate_private_key=$(printenv "DP${replica}_DELEGATE_OWNER_PRIVATE_KEY")
elasticsearch_host="audius-discovery-provider-elasticsearch-${replica}"
if nslookup "$elasticsearch_host" >/dev/null 2>&1; then
    export audius_elasticsearch_url="http://${elasticsearch_host}:9200"
fi

npm run dev
