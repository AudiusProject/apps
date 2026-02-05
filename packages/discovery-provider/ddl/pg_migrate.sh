#!/bin/bash
#
# PostgreSQL schema migration manager
# https://github.com/zenwalker/pg_migrate.sh/tree/v2.0

set -e
[[ -f .env ]] && source .env

MIGRATIONS_TABLE="schema_version"
MIGRATION_LOCK_ID="5432109876"  # Unique lock ID for migrations

POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_HOST=${POSTGRES_HOST:-127.0.0.1}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
export PGPASSWORD="$POSTGRES_PASSWORD"

is_test=$1

# setting DB_URL will override any individual settings from above
DB_URL=${DB_URL:-postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB}

# remove +psycopg2 from DB_URL
DB_URL="${DB_URL/\+psycopg2/}"

alias psql='psql -qtAX -v ON_ERROR_STOP=1 $DB_URL'
shopt -s expand_aliases


create_migrations_table() {
    migrations_table_exists=$(psql -c "SELECT to_regclass('$MIGRATIONS_TABLE');")

    if  [[ ! $migrations_table_exists ]]; then
        echo "Creating $MIGRATIONS_TABLE table"
        psql -c "CREATE TABLE $MIGRATIONS_TABLE (file_name text PRIMARY KEY, md5 text, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());"
    fi
}

copy_temp_data() {
    local file=$1
    local data_dir="./data/$(basename "$file" .sql)"
    local created_tables=()

    if [[ -d $data_dir ]]; then
        csv_files=$(ls "$data_dir"/*.csv 2>/dev/null)
        for csv_file in $csv_files; do
            table_name="temp_$(basename "$csv_file" .csv)"
            created_tables+=("$table_name")

            # Read CSV header to infer column names
            header=$(head -n 1 "$csv_file")
            IFS=',' read -r -a columns <<< "$header"

            psql -c "SET client_min_messages TO WARNING; DROP TABLE IF EXISTS $table_name"

            # Create the table with inferred column names (all columns as text for simplicity)
            create_table_sql="CREATE TABLE $table_name ("
            for column in "${columns[@]}"; do
                create_table_sql+="${column// /_} text, "
            done
            create_table_sql=${create_table_sql%, }  # Remove trailing comma and space
            create_table_sql+=");"

            psql -c "$create_table_sql"
            psql -c "\COPY $table_name FROM '$csv_file' CSV HEADER"
        done
    fi

    echo "${created_tables[@]}"
}

clear_temp_data() {
    local tables=("$@")

    for table_name in "${tables[@]}"; do
        echo "Dropping table $table_name"
        psql -c "DROP TABLE IF EXISTS $table_name"
    done
}

migrate_dir() {
    migration_files=$(ls "$1"/*.sql | sort -V)

    md5s=$(psql -c "select md5 from $MIGRATIONS_TABLE")

    for file in $migration_files; do
        md5=$(cat "$file" | tr -d "[:space:]" | md5sum | awk '{print $1}')

        if [[ $md5s =~ $md5 ]]; then
          continue
        fi

        # Create temp data tables if needed
        created_tables=($(copy_temp_data "$file"))
        for table in "${created_tables[@]}"; do
            echo "Created table $table"
        done

        # Execute migration sql file
        if [[ $file =~ "failable" ]]; then
            # echo "Applying failable $file"
            set +e
            psql < "$file"
            retval=$?
            if [[ $retval -ne 0 ]]; then
              echo "Failable: $file failed: $retval"
            fi
            set -e
        else
            echo "Applying $file"
            psql < "$file"
        fi

        # Clear temp data tables if any
        clear_temp_data "${created_tables[@]}"

        psql -c "INSERT INTO $MIGRATIONS_TABLE (file_name, md5) VALUES ('$file', '$md5') on conflict(file_name) do update set md5='$md5', applied_at=now();"
    done
}

test_dir() {
  migration_files=$(ls "$1"/*.sql | sort -V)

    for file in $migration_files; do
        echo "TEST $file"
        psql < "$file"
    done
}

acquire_migration_lock() {
    echo "Attempting to acquire migration lock..."
    lock_acquired=$(psql -c "SELECT pg_try_advisory_lock($MIGRATION_LOCK_ID);")
    
    if [[ $lock_acquired == "t" ]]; then
        echo "Migration lock acquired"
        return 0
    else
        echo "Migration lock not available. Waiting for migrations to complete..."
        
        psql -c "SELECT pg_advisory_lock($MIGRATION_LOCK_ID);"
        echo "Migration lock acquired after waiting"

        # Immediately release the lock since someone else ran it
        psql -c "SELECT pg_advisory_unlock($MIGRATION_LOCK_ID);"
        echo "Migration lock released"

        return 1
    fi
}

migrate() {
    # Try to acquire the migration lock
    if acquire_migration_lock; then
        create_migrations_table

        migrate_dir "utils"
        migrate_dir "migrations"
        #migrate_dir "functions"

        # "preflight" files run before server starts
        # to satisfy any necessary preconditions (e.g. inserting initial block)
        # the intention is to run "preflight" files for all environments EXCEPT test
        if [[ $PG_MIGRATE_TEST_MODE != "true" ]]; then
            migrate_dir "preflight"
        fi
    else
        # Another replica ran migrations, we're done
        echo "Another replica completed migrations. No-op."
    fi
}

run_tests() {
    # test idempotency
    echo "-- test idempotency --"
    migrate

    # run tests dir
    echo "-- sql tests --"
    test_dir "tests"
}

main() {
    case "$1" in
        "test") run_tests;;
        *) migrate
    esac
}

main "$@"
