#!/usr/bin/env bash

set -o xtrace
set -e

PG_PORT=$POSTGRES_TEST_PORT
if [ -z "${PG_PORT}" ]; then
  PG_PORT=4432
fi

export dbUrl="postgres://postgres:postgres@localhost:$PG_PORT/audius_creator_node_test"
export storagePath='./test_file_storage'
export logLevel='info'

# Locally, the docker-compose files set up a database named audius_creator_node. For
# tests, we use audius_creator_node_test. The below block checks if
# audius_creator_node_test exists in creator node 1, and if not, creates it (the tests will fail if this
# database does not exist). If psql is not installed (ex. in CircleCI), this command will
# fail, so we check if it is installed first.
# In CircleCI, the docker environment variables set up audius_creator_node_test instead of
# audius_creator_node. 

# CircleCI job and docker run in separate environments and cannot directly communicate with each other.
# Therefore the 'docker exec' command will not work when running the CI build. 
# https://circleci.com/docs/2.0/building-docker-images/#separation-of-environments
# So, if tests are run locally, run docker exec command. Else, run the psql command in the job.
if [ -z "${isCIBuild}" ]; then
  docker exec -i cn1_creator-node-db_1 /bin/sh -c "psql -U postgres -tc \"SELECT 1 FROM pg_database WHERE datname = 'audius_creator_node_test'\" | grep -q 1 || psql -U postgres -c \"CREATE DATABASE audius_creator_node_test\""
elif [ -x "$(command -v psql)" ]; then
  # taken from https://stackoverflow.com/a/36591842
  psql -U postgres -h localhost -p $PG_PORT -tc "SELECT 1 FROM pg_database WHERE datname = 'audius_creator_node_test'" | grep -q 1 || psql -U postgres -h localhost -p $PG_PORT -c "CREATE DATABASE audius_creator_node_test"
fi

mkdir -p $storagePath

# linter
./node_modules/.bin/standard

# setting delegate keys for app to start
export delegateOwnerWallet="0x1eC723075E67a1a2B6969dC5CfF0C6793cb36D25"
export delegatePrivateKey="0xdb527e4d4a2412a443c17e1666764d3bba43e89e61129a35f9abc337ec170a5d"

# tests
./node_modules/mocha/bin/mocha --timeout 30000 --exit

rm -r $storagePath

# remove test generated segments folder and .m3u8 file
rm -rf "./test/segments"
rm -rf "./test/testTrack.m3u8"
