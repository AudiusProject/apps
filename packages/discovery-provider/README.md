# Discovery Node

A Discovery Node is the metadata and indexing layer for the Audius Protocol.

## Development

See the dev-tools [README](https://github.com/AudiusProject/apps/tree/main/dev-tools).

```bash
audius-compose up

curl http://audius-discovery-provider-1/health_check
```

## Testing

Run tests

```bash
# Run all tests
audius-compose test discovery-provider

# Run unit tests
audius-compose test discovery-provider src

# Run integration tests
audius-compose test discovery-provider integration_tests

# A single test
audius-compose test discovery-provider src/api/v1/api_unit_test.py

# Run the testing container to attach your own tester
audius-compose test up discovery-provider
docker exec -it audius-test-test-discovery-provider-1 pytest

# To run a single test in the testing container
audius-compose test up discovery-provider
docker exec -it audius-test-test-discovery-provider-1 /bin/sh
pytest integration_tests/tasks/test_index_user_bank.py::test_process_user_bank_tx_details_valid_purchase

# To use the vscode tester, open the command palette
# and select Dev Containers: Attach to Running Container.
# Navigate to the test you want to run and run it!
```
[Install the Dev Containers extension for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).

## Linting

Run lint

```bash
./scripts/lint.sh

FIX_LINT=1 ./scripts/lint.sh
```

