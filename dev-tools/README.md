# Audius Protocol Dev Tools

## Setup

Make sure you've done `npm i` at the root of the repo. This will run `dev-tools/setup.sh`.

You may need to restart your shell, or do `. ~/.profile` to ensure everything is in your path.

Alternatively, you can install dev-tools without cloning the repo by doing:

```bash
curl "https://raw.githubusercontent.com/AudiusProject/apps/main/dev-tools/setup.sh" | bash
```

## Bring up the protocol

Make sure Docker is running and do:

```
npm run protocol
```

You can use `audius-compose ps` to ensure that all services report "Status" as Healthy.

> All options passed to `npm run protocol` will be passed to `audius-compose` under the hood.

> You can also do `audius-compose up` directly, but this has the disadvantage of not building the required Javascript dependencies before bringing up the protocol. See [CLI Tools](#cli-tools) for details

## Connect via hostname or client

To use the client from a mac, we need to route hostnames to the audius-compose nginx reverse proxy by running:

```
audius-compose connect
```

## CLI Tools

Use these CLI tools for Audius dev. Currently there are 3 tools available:

- `audius-compose`: start, stop, and manage Audius service containers
- `audius-cmd`: perform user actions, e.g. `create-user`, `upload-track`, `repost-playlist`

View all available commands for any of these tools with `--help`, e.g.

```bash
> audius-compose --help
> audius-cmd --help
```

### Perform actions with `audius-cmd`

You can confirm that things are wired up correctly by running `audius-cmd create-user`.
Note that `audius-cmd` requires the stack to be up and healthy, per [Bring up the protocol](#bring-up-the-protocol), and to have run `audius-compose connect`.

The `audius-cmd` script in this directory will build the `audius-cmd` tool if it detects
the output is missing. Otherwise, you can force a build by running `audius-cmd build`

Examples of available commands can be found [here](../packages/commands)

# Helpful Commands

Periodically prune docker cache

```
audius-compose prune
```

Get service logs

```
audius-compose logs discovery-provider-1 # get name from `docker ps`
```

Set environment variables

```
audius-compose set-env discovery-provider-1 audius_discprov_url https://discoveryprovider.testing.com/
```

Load environment variables

```
audius-compose load-env discovery-provider prod
```

# Troubleshooting

## Increase Docker Resource Requirements

Increase `docker` resource allocations to avoid OOM kills and your local docker image repository running out of space.
Below are suggested minimum values:

```bash
Docker > Preferences > Resources > Advanced
- CPUs 4
- Memory 13 GB
- Disk Image Size 120 GB
```

If you still run into issues, you may execute a `docker system prune` to free additional space.

# Development

## audius-compose

- The [audius-compose Python script](./audius-compose) in this directory handles all `audius-compose` command logic and subcommands. Any changes you make there will be reflected automatically - no reinstallation needed
- `audius-compose up` is a wrapper for creating the top-level .env file (see the `generate_env()` function in the `audius-compose` Python script) and then running `docker compose up` with various services passed as args

## Docker services

- Every Docker service is defined in one of the root-level .yml files (e.g., `docker-compose.discovery.prod.yml` for services related to Discovery Node), and then it's imported into `docker-compose.yml` using [extends](https://docs.docker.com/compose/extends/#understand-the-extends-configuration) syntax
  - This pattern prevents the top-level `docker-compose.yml` file from growing too large and allows every service to have standardized logging, `extra_hosts` (allows the containers to talk to each other), and memory limits (makes `docker stats` more readable) by using the `<<: *common` property. This property is YAML's "merge key" syntax which essentially adds every field from the `common` variable defined at the top of the file
  - `docker-compose.test.yml` also imports `docker-compose.yml` services for building images and testing in CI

## Networking

- `audius-compose connect` allows you to access containers via hostname by appending hostnames to your `/etc/hosts` (one-time operation unless you change container names or add a new service)
- This `/etc/hosts` change tells your browser (or CURL, or whatever) to go to `127.0.0.1`
- The `ingress` container listens on `127.0.0.1` for port 80 and redirects every request to the desired container based on hostname
  - For example, if you request `audius-discovery-provider-1/health_check`, the `ingress` container sees the hostname as `audius-discovery-provider-1` and directs it to the Discovery Node's container and port. This removes the need for you as the dev (or any application code except ingress) to ever worry about port numbers
- The `extra_hosts` config that gets added to every service in `docker-compose.yml` is what allows this to happen from within containers. For example, the `extra_hosts` line that says `- "audius-discovery-provider-1:host-gateway"` tells every container, "When you see the hostname "audius-discovery-provider-1", resolve it using the machine's (not the container's) localhost (i.e., "host-gateway"). Your machine's localhost knows to direct "audius-discovery-provider-1" to 127.0.0.1:80 (thanks to `audius-compose connect`), where the nginx `ingress` container will be listening and will direct the request to the Discovery Node container

## Adding a service

1. Configure the service in its own .yml file, either using an existing one (e.g., use `docker-compose.discovery.prod.yml` if it's a Discovery-related service) or by creating a new one
   - The typical pattern here is to have a `Dockerfile` in the service's directory, and then when configuring the service (e.g., in top-level `docker-compose.discovery.prod.yml`) use:
     ```
     service-name:
       build:
           context: <service_directory containing Dockerfile (e.g., discovery-provider)>
     ```
2. Add that service to the top-level `docker-compose.yml` file using the extends syntax, and then add `<<: *common`. Example:
   ```
   service-name:
     extends:
       file: docker-compose.service-name.yml
       service: service-name
     <<: *common
   ```
3. Allow all other containers to talk to the service via hostname by updating:
   - `extra_hosts` in the "common" variable at the top of `docker-compose.yml` like: `- "service-name:host-gateway"`
   - the list that `audius-compose connect` uses in the [audius-compose Python script](./audius-compose) in this directory to include `service-name`
4. Import the same service in `docker-compose.test.yml`, if needed, to build+test in CI
5. Optionally, add a flag to the `up` subcommand in the [audius-compose Python script](./audius-compose) in this directory if you want to do something like skip bringing up this service by default (helpful for expensive services)
