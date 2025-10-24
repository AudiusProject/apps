<p align="center">
  <br/>
  <a target="_blank" href="https://audius.co">
    <img src="https://user-images.githubusercontent.com/2731362/90302695-e5ae8a00-de5c-11ea-88b5-24c1408affc6.png" alt="Audius Logo" width="300">
  </a>
  <br/>

  <p align="center">
    The Decentralized <a target="_blank" href="https://audius.co">Audius.co</a> Client
    <br/>
    🎧🎸🎹🤘🎶🥁🎷🎻🎤🔊
  </p>
</p>

<br/>
<br/>

[![CircleCI](https://circleci.com/gh/AudiusProject/apps.svg?style=svg)](https://circleci.com/gh/AudiusProject/apps)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Development

There are 3 environments you can develop against

- dev (local net, see the [Audius Protocol](https://github.com/AudiusProject/apps))
- stage (test net)
- prod (main net)

### Running

```bash
npm run start:<environment>
```

When running against a dev environment on a remote machine, enable a network proxy:

```bash
networksetup -setautoproxyurl "Wi-Fi" "http://$AUDIUS_REMOTE_DEV_HOST:8080/proxy.pac"
```

### Building

```bash
# Bundles static assets into ./build-<environment>
npm run build:<environment>
```

### Electron (Desktop App)

To run electron using a static build:

```bash
npm run build:<environment>
npm run electron:<environment>
# Or to point at a local service with an optional port specifier
npm run electron:localhost # -- <port>
```

To build a desktop binary using a static build (outputs to `./dist`):

```bash
npm run build:<environment>

# Build all the binaries!!
npm run dist

npm run dist:mac
npm run dist:win
npm run dist:linux
```

### Testing

[Jest](https://jestjs.io/)

```
npm run test
```

### Analyze Webpack Bundle

[webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)

```
npm run analyzeBundle
```

### Linting

[StandardJS](https://standardjs.com) & [Prettier](https://prettier.io/)

```bash
npm run lint  # Show lint errors
npm run lint:fix  # Fix lint errors
```

### Web Workers

Audius DApp supports [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) by default to perform heavyweight async tasks. In order to include a package dependency for a worker, a scripts exists:

> ./scripts/publishScripts.sh

that sources JS files from /node_modules and exports a copy to /public/scripts for the
worker to pull via ImportScripts. See /src/workers for examples.

## Useful links

- [React](https://reactjs.org/tutorial/tutorial.html)
- [Redux](https://redux.js.org/basics)
- [Redux Saga](https://redux-saga.js.org/)
- [Redux Saga Test Plan](https://github.com/jfairbank/redux-saga-test-plan)
- [JavaScript Standard Style](https://standardjs.com)
