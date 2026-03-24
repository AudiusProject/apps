# Pedalboard

Pedalboard is a collection of packages and plugins meant to run alongside a discovery indexer and database. They're meant to operate in isolation but stack together to expose various combinations of functionality to the network.

```
npm install turbo --global
npm install
```

# Project Structure

There are two main directories where work is done. [Packages](./packages) and [Apps](./apps). Packages are modules and libraries that are useful across various plugins. Apps are code that gets compiled and run against the database and indexer.

## Verified notifications

The **verified-notifications** app is maintained in the **[pedalboard](https://github.com/AudiusProject/pedalboard)** repository (not under `apps/` here). Docker image `audius/verified-notifications`. Production deployment is defined in **[audius-k8s](https://github.com/AudiusProject/audius-k8s)** (Pulumi stack `verified-notifications`). Local compose uses the published image; see `dev-tools/compose/docker-compose.pedalboard.prod.yml`.

# Starting a new application

To create a new application copy and paste the [app-template](./apps/app-template/). Rename your directory and package json project name to what you'd like and you should be ready to start developing. The application template will have an example app for you to get started with.

At this time of writing this is what it looks like:

```
import { log } from "@pedalboard/logger";
import App from "@pedalboard/basekit/src/app";
import moment from "moment";

type SharedData = {};

const main = async () => {
  await new App<SharedData>({})
    .tick({ seconds: 5 }, async (_app) => {
      console.log(`tick ${moment().calendar()}`)
    })
    .run();
};

(async () => {
  await main().catch(log);
})();
```

# Starting a new package

1. Copy the app template

```
cp ./apps/app-template ./apps/my-app
```

2. Modify `package.json` to have your app name

3. Install dependencies from the monorepo root
4. 
```
npm i
```

# Building and running apps in isolation

Inside `/dev-tools/compose` is a [docker compose for pedalboard](../../../../dev-tools/compose/docker-compose.pedalboard.dev.yml) file that houses all of the applications. Building and running your new application alongside the other is as simple as following the `app-template` example.

1. Add your new service by copying what the `app-template` does.

```
app-template:
  extends:
    file: docker-compose.pedalboard.prod.yml
    service: app-template
  build:
    dockerfile: ${PROJECT_ROOT}/packages/discovery-provider/plugins/pedalboard/docker/Dockerfile.dev
  volumes:
    - ${PROJECT_ROOT}:/app
```

2. Run the docker file with the build flag

```
docker compose -f dev-tools/compose/docker-compose.pedalboard.dev.yml up app-template --build -d
```

3. In docker dashboard or `docker ps` you should find your running container

```
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

NAMES                        IMAGE                                    STATUS
trending-challenge-rewards   pedalboard-trending-challenge-rewards    Up 21 minutes
app-template                 pedalboard-app-template                  Up 21 minutes
```

# Tools

Turborepo

Docker

Typescript

Npm
