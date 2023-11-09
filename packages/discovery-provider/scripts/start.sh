#!/bin/bash
set -e

if [ -z "$audius_redis_url" ]; then
    redis-server --daemonize yes
    export audius_redis_url="redis://localhost:6379/00"
    export WAIT_HOSTS="localhost:6379"
    /wait
fi

# Only used for tests. Local dev uses postgres:postgres@db:5432/discovery_provider_${replica}
if [ -z "$audius_db_url" ]; then
    sudo -u postgres pg_ctl start -D /db -o "-c shared_preload_libraries=pg_stat_statements"
    export WAIT_HOSTS="localhost:5432"
    /wait

    sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${postgres_password:-postgres}';"

    export audius_db_url="postgresql+psycopg2://postgres:${postgres_password:-postgres}@localhost:5432/audius_discovery"
    export audius_db_url_read_replica="postgresql+psycopg2://postgres:${postgres_password:-postgres}@localhost:5432/audius_discovery"
fi

export PYTHONUNBUFFERED=1

audius_discprov_loglevel=${audius_discprov_loglevel:-info}

# used to remove data that may have been persisted via a k8s emptyDir
export audius_prometheus_container=server

# run migrations
if [ "$audius_db_run_migrations" != false ]; then
    echo "Running pg_migrate.sh migrations"
    (cd ddl ; DB_URL="$audius_db_url" bash pg_migrate.sh)
    echo "Finished running pg_migrate.sh migrations"
fi

# start es-indexer
if [[ "$audius_elasticsearch_url" ]] && [[ "$audius_elasticsearch_run_indexer" == "true" ]]; then
    (
        cd es-indexer && npm start &
    )
fi

# start api server + celery workers
if [[ "$audius_discprov_dev_mode" == "true" ]]; then
    if [[ "$audius_no_server" != "true" ]] && [[ "$audius_no_server" != "1" ]]; then
        audius_service=server ./scripts/dev-server.sh 2>&1 | tee >(logger -t server) &
    fi

    if [[ "$audius_no_workers" != "true" ]] && [[ "$audius_no_workers" != "1" ]]; then
        # Clear the celerybeat artifacts
        [ -e /var/celerybeat-schedule ] && rm /var/celerybeat-schedule
        [ -e /var/celerybeat.pid ] && rm /var/celerybeat.pid
        audius_service=beat celery -A src.worker.celery beat --schedule=/var/celerybeat-schedule --pidfile=/var/celerybeat.pid --loglevel WARNING 2>&1 | tee >(logger -t beat) &
        audius_service=worker watchmedo auto-restart --directory ./ --pattern=*.py --recursive -- celery -A src.worker.celery worker --loglevel $audius_discprov_loglevel 2>&1 | tee >(logger -t worker) &
    fi
else
    if [[ "$audius_no_server" != "true" ]] && [[ "$audius_no_server" != "1" ]]; then
        audius_service=server ./scripts/prod-server.sh 2>&1 | tee >(logger -t server) &
    fi

    if [[ "$audius_no_workers" != "true" ]] && [[ "$audius_no_workers" != "1" ]]; then
        # Clear the celerybeat artifacts
        [ -e /var/celerybeat-schedule ] && rm /var/celerybeat-schedule
        [ -e /var/celerybeat.pid ] && rm /var/celerybeat.pid
        audius_service=beat celery -A src.worker.celery beat --schedule=/var/celerybeat-schedule --pidfile=/var/celerybeat.pid --loglevel WARNING 2>&1 | tee >(logger -t beat) &
        # start worker dedicated to indexing ACDC
        audius_service=worker celery -A src.worker.celery worker -Q index_nethermind --loglevel $audius_discprov_loglevel --hostname=index_nethermind --concurrency 1 2>&1 | tee >(logger -t index_nethermind_worker) &

        # start other workers with remaining CPUs
        audius_service=worker celery -A src.worker.celery worker --max-memory-per-child 300000 --loglevel $audius_discprov_loglevel --concurrency=$(($(nproc) - 5)) 2>&1 | tee >(logger -t worker) &

    fi
fi

wait
