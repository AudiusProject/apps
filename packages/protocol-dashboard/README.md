# Audius Service Provider Dashboard

## Summary
Audius Service Provider Dashboard allows users to register content nodes and discovery providers, 
view their registered services & which ones are out date, and explore all audius services.

## Running the Application
The application requires ethereum contracts.
You can run `npm run start:stage` which will use the contracts that are on the staging environment.
If you want to have contracts running locally, you'll also need to run this [setup script](https://github.com/AudiusProject/apps/blob/master/service-commands/scripts/setup.js) e.g. `node setup.js run eth-contracts up`

To start:
1. Install Dependencies `npm install`
2. Run the Application `npm run start:<environment>`

To Deploy:
Make sure the DASHBOARD_BASE_URL env var is unset on the machine you are deploying on. Build the application using `npm run build:prod` and serve the static `dist` folder as a simple page app via `npm run serve`
 
