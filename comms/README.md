# comms

For DMs

### Setup

You need:

- docker
- go 1.19
- make

Verify setup:

- Ensure you have `~/go/bin` in your path

### Run + test

- `make` - dev on discovery or storage (view logs with `docker logs -f audius-discovery-1` or `docker logs -f audius-storage-1`)
- `make test` - view test output (tests run automatically when changing files)
- the above both hot reload, so you don't need to do `make` again unless you break hot reloading (e.g., creating/deleting files)

Re-run make after code changes

### Typings

- Update `apps/packages/libs/src/sdk/api/chats/serverTypes.ts` to add or modify type definitions
- Run `make quicktype`
- Update go code to use types

### Deploy to Staging

Currently docker build + push is done locally and some bash scripts are used to launch on staging machines.

- Authenticate on Dockerhub
- `bash bash_scripts/deploy.sh`
