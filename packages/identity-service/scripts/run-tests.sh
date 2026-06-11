#!/usr/bin/env bash
set -o xtrace
set -e

while getopts d flag
do
  case "${flag}" in
      d) debug=true;
  esac
done

PG_PORT=$POSTGRES_TEST_PORT
if [ -z "${PG_PORT}" ]; then
  PG_PORT=7433
fi
echo $PG_PORT

export ethTokenAddress=''
export ethRegistryAddress=''
export registryAddress=''
export ethOwnerWallet=''
export isTestRun=true
export redisHost='localhost'
export redisPort='6379'
export dbUrl="postgres://postgres:postgres@localhost:$PG_PORT/audius_identity_service_test"
export logLevel='debug' #should be error
export environment='test'

# Locally, the docker-compose files set up a database named audius_identity_service. For
# tests, we use audius_identity_service_test. The below block checks if
# audius_identity_service_test exists, and if not, creates it (the tests will fail if this
# database does not exist). If psql is not installed (ex. in CircleCI), this command will
# fail, so we check if it is installed first.
# In CircleCI, the docker environment variables set up audius_identity_service_test instead of
# audius_identity_service.

# CircleCI job and docker run in separate environments and cannot directly communicate with each other.
# Therefore the 'docker exec' command will not work when running the CI build.
# https://circleci.com/docs/2.0/building-docker-images/#separation-of-environments
# So, if tests are run locally, run docker exec command. Else, run the psql command in the job.

DB_CONTAINER='identity-test-db_1'
DB_EXISTS=$(docker ps -a -q -f status=running -f name=^/${DB_CONTAINER}$)
if [ -z "${DB_EXISTS}" ]; then
  echo "DB Container doesn't exist"
  docker run -d --name $DB_CONTAINER -p 127.0.0.1:$PG_PORT:5432 postgres:11.1
  sleep 1
fi

REDIS_CONTAINER='identity_test_redis'
REDIS_EXISTS=$(docker ps -a -q -f status=running -f name=^/${REDIS_CONTAINER}$)
if [ ! "${REDIS_EXISTS}" ]; then
  echo "Redis Container doesn't exist"
  docker run -d --name $REDIS_CONTAINER -p 127.0.0.1:$redisPort:6379 redis:7.0
  sleep 1
fi

if [ -z "${isCIBuild}" ]; then
  # taken from https://stackoverflow.com/a/36591842
  docker exec -i $DB_CONTAINER /bin/sh -c "psql -U postgres -tc \"SELECT 1 FROM pg_database WHERE datname = 'audius_identity_service_test'\" | grep -q 1 || psql -U postgres -c \"CREATE DATABASE audius_identity_service_test\""
elif [ -x "$(command -v psql)" ]; then
  psql -U postgres -h localhost -p $PG_PORT -tc "SELECT 1 FROM pg_database WHERE datname = 'audius_identity_service_test'" | grep -q 1 || psql -U postgres -h localhost -p $PG_PORT -c "CREATE DATABASE audius_identity_service_test"
fi

# tests
if [ "${debug}" ]; then
  # If the -d debug flag is provided, run the tests with no timeout so that
  # debugging does not get interrupted
  TIMEOUT=0
else
  TIMEOUT=12000
fi

../../node_modules/ts-mocha/bin/ts-mocha test/index.ts --timeout "${TIMEOUT}" --exit

# linter

npm run lint
