# API Client Generator

Generates a typed client of the Audius read-only API using a running API instance.

## Prerequisites

This repository uses `@openapitools/openapi-generator-cli` which requires Java 8 runtime (JRE) to be installed.

Linux:

```bash
sudo apt install default-jre
```

## Generating Types

Commands are in the form:

```bash
npm run gen:{env}:{flavor?}
```

### Options

- `env` choices=("dev", "stage", "prod"): Which environment to choose the API environment to generate from
  - `dev`: http://127.0.0.1:1323/
  - `stage`: https://api.staging.audius.co/
  - `prod`: https://api.audius.co
- `flavor` [optional] choices=("default", "full"): Which flavor of the API to generate types for
  - undefined for both
  - `default` for /v1
  - `full` for /v1/full

```bash
#### DEVELOPMENT ####
npm run gen:dev
npm run gen:dev:default
npm run gen:dev:full

#### STAGING ####
npm run gen:stage
npm run gen:stage:default
npm run gen:stage:full

#### PROD ####
npm run gen:prod
npm run gen:prod:default
npm run gen:prod:full
```

### Manually

Alternatively, run the script manually:

```bash
node ./gen.js --help
```

```
Usage: gen [options] [command]

Options:
  -h, --help            display help for command

Commands:
  generate [options]    Generates the client
  template [generator]  Download templates for the given generator
  help [command]        display help for command
```

## Getting templates

See also: https://openapi-generator.tech/docs/templating

```bash
node ./gen.js template --help
```

```bash
Usage: gen template [options] [generator]

Download templates for the given generator

Arguments:
  generator   The generator to download templates for (default: "typescript-fetch")

Options:
  -h, --help  display help for command
```
