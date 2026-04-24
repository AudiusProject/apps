# Audius Service Provider Dashboard

## Summary
Audius Service Provider Dashboard allows users to register content nodes and discovery providers, 
view their registered services & which ones are out date, and explore all audius services.

## Running the Application
The application requires ethereum contracts.

From the repo root, the typical default runs the dashboard against production contracts:

```
npm run dashboard
```

To run against locally-running contracts, you'll also need to run this [setup script](https://github.com/AudiusProject/apps/blob/master/service-commands/scripts/setup.js) e.g. `node setup.js run eth-contracts up`, then:

```
npm run dashboard:dev
```

To start:
1. Install Dependencies `npm install`
2. Run the Application `npm run dashboard` (or `npm run dashboard:dev` for local)

To Deploy:
Make sure the DASHBOARD_BASE_URL env var is unset on the machine you are deploying on. Build the application using `npm run build:prod` and serve the static `dist` folder as a simple page app via `npm run serve`
 
