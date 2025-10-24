#!/usr/bin/env sh
if [[ "$audius_db_url" == "" ]]; then
    export audius_db_url="postgresql://postgres:postgres@audius-db-1:5432/discovery_provider_${replica}"
    export audius_db_url_read_replica="postgresql://postgres:postgres@audius-db-1:5432/discovery_provider_${replica}"
fi

if [[ "$audius_redis_url" == "" ]]; then
    export audius_redis_url="redis://audius-discovery-provider-redis-${replica}:6379/00"
fi

export audius_enable_rsyslog=false

export audius_discprov_url="http://audius-discovery-provider-${replica}"

export audius_delegate_owner_wallet=$(printenv "DP${replica}_DELEGATE_OWNER_ADDRESS")
export audius_delegate_private_key=$(printenv "DP${replica}_DELEGATE_OWNER_PRIVATE_KEY")
