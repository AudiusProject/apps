<p align="center">
  <br/>
  <img src="./packages/web/src/assets/img/audiusLogoColored.png#gh-light-mode-only" alt="Audius Logo" width="200">
  <img src="./packages/web/src/assets/img/audiusLogoWhite.png#gh-dark-mode-only" alt="Audius Logo" width="200">

  <br/>

  <p align="center">
    The Audius Monorepo
    <br/>
    🎧🎸🎹🤘🎶🥁🎷🎻🎤🔊
  </p>
</p>

<br/>
<br/>

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/AudiusProject/apps/tree/main.svg?style=svg&circle-token=7813cfa60dbb92905f7fa2979eced3e33f1d77af)](https://dl.circleci.com/status-badge/redirect/gh/AudiusProject/apps/tree/main)

Audius is a decentralized, community-owned music-sharing protocol

For details on operating an Audius service, getting started with the Token and the API, see [docs.audius.org](https://docs.audius.org/).

## Packages

| Name                                                                                            | Description                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`web`](./packages/web)                                                                         | Web and desktop apps                                                                                                                                                                  |
| [`mobile`](./packages/mobile)                                                                   | Mobile app                                                                                                                                                                            |
| [`embed`](./packages/embed)                                                                     | Embed player that renders on third party sites (like X and Discord)                                                                                                                   |
| [`sdk`](./packages/sdk)                                                                         | The `@audius/sdk` typescript SDK                                                                                                                                                      |
| [`harmony`](./packages/harmony)                                                                 | The Audius design system                                                                                                                                                              |
| [`common`](./packages/common)                                                                   | Shared code between web and mobile                                                                                                                                                    |
| [`identity-service`](packages/identity-service)                                                 | Audius auth library                                                                                                                                                                   |
| [`commands`](./packages/commands)                                                               | CLI to perform actions against the dev stack                                                                                                                                          |
| [`compose`](./packages/compose)                                                                 | Defines dependencies for audius-compose                                                                                                                                               |
| [`eslint-config-audius`](./packages/eslint-config-audius)                                       | Shared lint configuration                                                                                                                                                             |
| [`spl`](./packages/spl)                                                                         | Handles Solana instructions for the Audius programs                                                                                                                                   |
| [`eth`](./packages/eth)                                                                         | Handles interactions for the Audius Ethereum Governance & Staking Contracts                                                                                                           |

### Required Dependencies

We recommend using [homebrew](https://brew.sh/) to install the dependencies required to run Audius:

```bash
brew install nvm pyenv rbenv homebrew/cask/docker docker-compose
```

> You will need to add some shell configuration for [`nvm`](https://github.com/nvm-sh/nvm#installing-and-updating), [`pyenv`](https://github.com/pyenv/pyenv#set-up-your-shell-environment-for-pyenv), and [`rbenv`](https://github.com/rbenv/rbenv#basic-git-checkout). Please refer to the respective documentation and the installation output

### Getting Started

```bash
npm install
```

This will do the following:

- Install the correct versions of node, ruby, and python
- Install dependencies (npm packages, gems, pods, etc.)
- Set up command line tools for interacting with the protocol ([dev-tools/README.md](./dev-tools/README.md))
- Initialize git hooks

### Running the Protocol

```bash
npm run protocol
```

For more details and troubleshooting please refer to [dev-tools/README.md](./dev-tools/README.md)

### Running the Apps

Environments:

- `\*:dev` runs against local services
- `\*:stage` runs against the staging testnet
- `\*:prod` runs against production infrastructure

For example:

```bash
npm run web:prod
```

For all available commands please see the [package.json scripts](https://github.com/AudiusProject/apps/blob/f850434ddca7d697f78a58d971f9bba1aba7f24d/package.json#L10) and the relevant package READMEs.

## Contributing

We welcome contributions to Audius from anyone who opens a PR. Feel free to reach out to
our team [on Discord](https://discord.gg/audius) or via other channels for feedback and/or support!

## Security

Please report security issues to `security@audius.co` with a description of the
vulnerability and any steps to reproduce. Details on our bug bounty program are available at [audius.org/security](https://audius.org/security)

## License

Apache 2.0: [LICENSE file](https://github.com/AudiusProject/apps/blob/main/LICENSE)
