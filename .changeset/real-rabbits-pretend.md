---
'@audius/sdk': major
---

Create SDK without services by default in all cases

Updates the `sdk()` constructor to create the SDK without the old services and API structure regardless of config. This will align all configurations to have the same API surface that matches existing docs and examples.

To maintain compatibility, older legacy apps can use `createSdkWithServices()` instead of `sdk()` when initting the SDK. This is not advised for third-party apps.
