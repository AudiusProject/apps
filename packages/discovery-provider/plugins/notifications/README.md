# Discovery Node Notifications Plugin

---

## Summary

The Notifications Plugin is designed to send push notifications

## How To Run

```
audius-compose up discovery-provider-notifications
```

## Regenerate sql-ts types

See [sql-ts](https://github.com/AudiusProject/apps/tree/main/packages/sql-ts)

## Sending a test sns push

Run: `npx ts-node scripts/test-push-notification.ts`
Follow the prompts.
To find the targetARN, look at identity's db and query the table `NotificationDeviceTokens`
ie `select * from "NotificationDeviceTokens" where "userId"=<YOUR_USER_ID>;`

### Environment Variables

The Notifications Plugin is configured with a set of environment variables.
Before running the service, these need to be configured appropriately.

```sh

# AWS values for sending push notifications
AWS_REGION=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""

# Discovery DB Connection String
DN_DB_URL=""

# Discovery Redis Conection string
AUDIUS_REDIS_URL=""

# Identity DB Connection String
IDENTITY_DB_URL=""

# Email sending API Key
SENDGRID_API_KEY="

```

`docker run --env-file StageDiscoveryNotificationPlugin.env jwolee/discovery-notificatino-plugin`
