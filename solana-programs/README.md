# Audius Solana Programs

## Setup

### Rust

[Install Rust](https://www.rust-lang.org/tools/install)

Each folder should have a `rust-toolchain` specifying the version of rust you need.

### Solana

[Install Solana](https://docs.solanalabs.com/cli/install)

Note: These programs have not been migrated to [Agave](https://solana.com/developers/guides/getstarted/setup-local-development).

Please use the latest install of Solana and the build script will sync the right versions for you using `solana-install` (1.14.18 for legacy programs, 1.16.9 for Anchor programs at time of writing):

```
sh -c "$(curl -sSfL https://release.solana.com/v1.18.18/install)"
```

### Anchor

[Install Anchor](https://www.anchor-lang.com/docs/installation)

Used for the Payment Router and Staking Bridge. Build script will ensure the matching version of Anchor is used (0.28.0 at time of writing) via `avm use`.

```
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
```

## Development

New programs should use [Anchor](https://www.anchor-lang.com/).

Copy the IDL and types to the `@audius/spl` package for easier, standardized consumption, and create clients in `@audius/sdk` with sane defaults.

## Create audius/solana-test-validator for development

### 1. Build the programs locally on your machine

This script will make sure to use the correct versions of Solana CLI and Anchor to build each individual program, as well as replace the program IDs with the development ones (and restore them after).

```bash
./scripts/build.sh
```

#### Why not build in a docker image?

There is a world in which we can build the Solana programs inside the docker image. However, this in practice is _insanely_ slow in comparison to building on the host. There's no prebuilt binaries for ARM64 Linux for Solana CLI, and even if there was, it's not a supported target for `build-bpf`. Therefore, the docker image would require:

1. Building legacy programs from a amd64-linux emulated Rust 1.59 image using Solana 1.14.18
2. Buliding Anchor programs from an amd64-linux emulated Rust 1.79 image using Solana 1.16.9
3. Building solana-test-validator in an arm64-linux Rust 1.79 image using Solana 1.18.22

Each of which takes _forever_ on our dev machines, and despite parallelizing 1 and 2, in total takes over 30 minutes.

There are some benefits to building in a docker container, but they don't seem to apply here. There's generally never changes to these programs, and if there are, typically the changes are done on the host, built on the host, and deployed from the host. The dev experience of waiting >30 min for local stack is far far worse than the convenience of building these programs. A prebuilt image is sufficient for 99% of usage here, and a separate build script is ok.

Do feel free to check the git history for previous attempts at building this all in one docker image though and try it out. It works, but it's painful!

### 2. Build and push the image for both arm64 and amd64

The Macs we use for development use ARM64, the CI runs with AMD64.

The docker image will pull the output from the build above into it, as well as the fixtures set up in the `./fixtures/` folder.

```bash
cd ../dev-tools/compose
docker buildx bake -f docker-compose.yml solana-test-validator-build --push
```

## Regenerating Fixtures

If for any reason the fixtures need to be regenerated, run the container without them (edit Dockerfile.dev and remove the fixtures from the final command, and restart the container):

```docker
CMD solana-test-validator --ledger /usr/db \
    --bpf-program ${SOLANA_AUDIUS_ETH_REGISTRY_PUBLIC_KEY} audius_eth_registry.so \
    --bpf-program ${SOLANA_TRACK_LISTEN_COUNT_PUBLIC_KEY} track_listen_count.so \
    --bpf-program ${SOLANA_CLAIMABLE_TOKENS_PUBLIC_KEY} claimable_tokens.so \
    --bpf-program ${SOLANA_REWARD_MANAGER_PUBLIC_KEY} audius_reward_manager.so \
    --bpf-program ${SOLANA_PAYMENT_ROUTER_PUBLIC_KEY} payment_router.so \
    --reset
```

Then, run:

```bash
./scripts/init-dev-fixtures.sh
```

NOTE: The Reward Manager Lookup Table is not included in this script. To recreate the Reward Manager lookup table, see packages/libs/src/sdk/scripts/manageRewardsLookupTable.ts. You'll then have to export it to a file using the same commands found in the init-dev-fixtures.sh script

## Adding a new program to the solana-test-validator

1. Make sure to add the program's .so file to the `audius/solana-test-validator` image (Dockerfile.dev).
2. Add a `rust-toolchain` file with the version of Rust that works with your program.
3. Make sure `./scripts/update-keys.sh` can update the Program ID and key for your program.
4. Make sure `./scripts/build.sh` can build your program - make sure it loads the correct Solana and/or Anchor version before building.
5. After initializing your program, consider making fixtures of the relevant account states and adding them to the `audius/solana-test-validator` container.

## Scripts

`./scripts/build.sh`

Builds all programs and the CLIs. Note: This will change your working version of Solana and Anchor, change them back if necessary.

`./scripts/init-dev-fixtures.sh`

Run this script on a `solana-test-validator` with the programs deployed to initialize the programs and write the relevant accounts to the `./fixtures` folder, so that they can be preloaded in subsequent `solana-test-validator` runs.

`./scripts/install-solana.sh`

Helper script to install solana in a container. Building the x86_64 build of `audius/solana-test-validator` doesn't require building from source, but the arm64 build does.

`./scripts/update-keys.sh`

Helper script to update Program IDs and deploy keys to the local dev configured ones. Uses `../dev-tools/compose/.env` to source the private keys for each program. This will dirty the git status, so be sure to run `./scripts/update-keys.sh restore` when you're done (`./scripts/build.sh` calls this internally)

### Note: rust-analyzer

Due to the pinned Rust versions used for these programs, the rust-analyzer version used must be pinned to v0.3.1386. For VS Code's extension, drop down from "Uninstall" and select "Install specific version".

See: https://github.com/rust-lang/rust-analyzer/issues/17910
