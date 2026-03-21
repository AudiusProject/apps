<p align="center">
  <br/>
  <img src="./packages/web/src/assets/img/audiusLogoBlack.png#gh-light-mode-only" alt="Audius" width="200">
  <img src="./packages/web/src/assets/img/audiusLogoStackedWhite.png#gh-dark-mode-only" alt="Audius" width="200">
  <br/>
  <a href="https://audius.co">audius.co</a> &nbsp;&bull;&nbsp; <a href="https://docs.audius.co">docs.audius.co</a>
</p>

<br/>

[![web](https://img.shields.io/github/actions/workflow/status/AudiusProject/apps/web.yml?label=web&style=for-the-badge)](https://github.com/AudiusProject/apps/actions/workflows/web.yml) [![mobile](https://img.shields.io/github/actions/workflow/status/AudiusProject/apps/mobile.yml?label=mobile&style=for-the-badge)](https://github.com/AudiusProject/apps/actions/workflows/mobile.yml) [![sdk](https://img.shields.io/github/actions/workflow/status/AudiusProject/apps/sdk.yml?label=sdk&style=for-the-badge)](https://github.com/AudiusProject/apps/actions/workflows/sdk.yml)</br>
[![npm @audius/sdk](https://img.shields.io/npm/v/@audius/sdk?label=%40audius%2Fsdk&style=for-the-badge)](https://www.npmjs.com/package/@audius/sdk) [![npm @audius/harmony](https://img.shields.io/npm/v/@audius/harmony?label=%40audius%2Fharmony&style=for-the-badge)](https://www.npmjs.com/package/@audius/harmony) [![npm @audius/spl](https://img.shields.io/npm/v/@audius/spl?label=%40audius%2Fspl&style=for-the-badge)](https://www.npmjs.com/package/@audius/spl) [![npm @audius/eth](https://img.shields.io/npm/v/@audius/eth?label=%40audius%2Feth&style=for-the-badge)](https://www.npmjs.com/package/@audius/eth)

Community-run music platform and developer gateway to the internet's largest open music catalog, the [Open Audio Protocol](https://openaudio.org).

## Packages

| Name                                                      | Description                                            |
| --------------------------------------------------------- | ------------------------------------------------------ |
| [`web`](./packages/web)                                   | Web and desktop app                                    |
| [`mobile`](./packages/mobile)                             | iOS and Android app                                    |
| [`embed`](./packages/embed)                               | Embed player for third-party sites (X, Discord, etc.)  |
| [`sdk`](./packages/sdk)                                   | `@audius/sdk` — TypeScript SDK for the Audius protocol |
| [`harmony`](./packages/harmony)                           | Audius design system                                   |
| [`common`](./packages/common)                             | Shared state, models, and utilities for web and mobile |
| [`spl`](./packages/spl)                                   | Solana program instructions for Audius                 |
| [`eth`](./packages/eth)                                   | Ethereum governance and staking contract interactions  |
| [`fixed-decimal`](./packages/fixed-decimal)               | Fixed-point decimal math utilities                     |
| [`identity-service`](./packages/identity-service)         | Auth and identity service                              |
| [`commands`](./packages/commands)                         | CLI for performing actions against the dev stack       |
| [`compose`](./packages/compose)                           | audius-compose service definitions                     |
| [`eslint-config-audius`](./packages/eslint-config-audius) | Shared ESLint configuration                            |

### Getting Started

```bash
npm install
```

This will do the following:

- Install the correct versions of node, ruby, and python
- Install dependencies (npm packages, gems, pods, etc.)
- Set up command line tools for interacting with the protocol ([dev-tools/README.md](./dev-tools/README.md))
- Initialize git hooks

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
