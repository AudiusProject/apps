# 0008. Notifications, analytics and flags in common

- Status: Accepted
- Date: 2026-11-21

## Context

Notification adapters and copy, analytics sampling, feature flags, remote config and Weekly Rotation. These records were moved out of code comments by the comment purge ([0001](0001-no-code-comments.md)). Each links to where the comment sat at `b3133cffff`.

## Decisions

### `adapters/notification.ts`

- In notificationFromSDK (adapters/notification.ts) track create notifications carry the track owner id at groupId.split(':')[3]. ([L230](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/adapters/notification.ts#L230))
- In notificationFromSDK (adapters/notification.ts) album/playlist create notifications store the owner id as the action specifier. ([L232](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/adapters/notification.ts#L232))
- In notificationFromSDK (adapters/notification.ts) album/playlist create notifications store the owner id as the action specifier. ([L233](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/adapters/notification.ts#L233))

### `api/tan-query/notifications/useNotificationEntities.ts`

- useNotificationEntities fetches only entityIds[0] for UserSubscription notifications because the UI renders just the first track for single uploads and only a count for multi-uploads. ([L78](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/notifications/useNotificationEntities.ts#L78))

### `api/tan-query/notifications/useNotificationEntity.ts`

- useNotificationEntity resolves the event first for Event-typed notifications because the indexer sends entity_id = event_id for remix-contest comments; the event's entityId (parent track) is then used so links render and navigate. ([L23](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/notifications/useNotificationEntity.ts#L23))
- useNotificationEntity uses the event's userId (the contest host) as the owner for Event-typed notifications, not the underlying track's owner. ([L48](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/notifications/useNotificationEntity.ts#L48))

### `api/tan-query/users/useListenerCities.ts`

- useListenerCities data is only readable by the artist or one of their managers. ([L27](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/api/tan-query/users/useListenerCities.ts#L27))

### `hooks/useFeatureFlag.ts`

- HARDCODED_ENABLED_FLAGS in useFeatureFlag forces flags on for native only, bypassing Optimizely, env defaults and local overrides; web keeps honoring Optimizely. Use only for short-lived release toggles. ([L138](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useFeatureFlag.ts#L138))

### `hooks/useQueueNewFeatureBadge.ts`

- useQueueNewFeatureBadge dispatches the literal 'ANALYTICS/IDENTIFY' type, mirroring web's analytics IDENTIFY action, so the analytics saga forwards the A/B variation to Amplitude as a user property. ([L11](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useQueueNewFeatureBadge.ts#L11))

### `hooks/useShareContent.ts`

- useShareContent calls every entity hook unconditionally and relies on each short-circuiting on a null ID, keeping the hook call count constant per the rules of hooks. ([L5](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/hooks/useShareContent.ts#L5))

### `messages/notifications.ts`

- weeklyArtistRecapNotificationMessages.body omits zero followers/saves and a missing city, matching the push notification text exactly. ([L30](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/messages/notifications.ts#L30))

### `models/Analytics.ts`

- PlaybackPlay.weeklyRotationOwnerId is set on passive plays too, so auto-advance through a Weekly Rotation mix is attributed to that mix. ([L676](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/models/Analytics.ts#L676))

### `models/AnalyticsSampling.ts`

- CORE_ANALYTICS_EVENTS in AnalyticsSampling.ts are sent from every device; all other events are sent only from a fixed sample of devices (getAnalyticsSampleRate) to stay under the Amplitude volume cap. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/models/AnalyticsSampling.ts#L3))
- CHAT_REPORT_USER is in CORE_ANALYTICS_EVENTS because the analytics event is the only record of a chat abuse report, so it must never be sampled out. ([L122](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/models/AnalyticsSampling.ts#L122))
- AnalyticsSampling hashes the device ID with FNV-1a so a device lands in the same sample bucket on every load and platform. ([L168](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/models/AnalyticsSampling.ts#L168))
- getAnalyticsSampleRate returns the rate an event was sent at; non-core events carry it as a sampleRate property so counts can be scaled back up in Amplitude. ([L186](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/models/AnalyticsSampling.ts#L186))

### `services/remote-config/feature-flags.ts`

- FeatureFlags enum values must be lowercase snake_case to match Optimizely keys. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/remote-config/feature-flags.ts#L3))
- WEEKLY_ROTATION defaults on so shared links render before the Optimizely datafile loads; the remote flag acts as kill switch. ([L72](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/remote-config/feature-flags.ts#L72))
- TRACK_ROWS defaults off because an Optimizely false falls through to the code default, so only a code default of false can turn it off. ([L75](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/remote-config/feature-flags.ts#L75))
- NOW_PLAYING_COMMENTS defaults on; the remote flag is the kill switch. ([L78](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/remote-config/feature-flags.ts#L78))
- MOBILE_MANAGER_MODE gates only the account switcher and manager settings; switching back out and manager-mode restrictions stay on regardless. ([L85](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/remote-config/feature-flags.ts#L85))
- GROUP_MESSAGES gates only creating group DMs; existing groups always render. ([L95](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/remote-config/feature-flags.ts#L95))

### `services/remote-config/remote-config.ts`

- MobileClientInfo.otaVersion is the running CodePush label (e.g. "v17") or "native" when no OTA is applied. ([L33](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/remote-config/remote-config.ts#L33))
- waitForUserRemoteConfig exists because waitForRemoteConfig can resolve before the user id is set, so user-dependent flags would bucket by session id. ([L240](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/services/remote-config/remote-config.ts#L240))

### `store/notifications/types.ts`

- Remix-contest comment notifications use data.type "Event" because the indexer stamps the contest event_id as entity_id; renderers label it a remix contest and navigate via the underlying track. ([L113](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/notifications/types.ts#L113))
- In milestone push notification types, actions[].actionEntityId holds the milestone value, not an entity id. ([L343](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/notifications/types.ts#L343))
- In milestone push notification types, actions[].actionEntityId holds the milestone value, not an entity id. ([L365](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/notifications/types.ts#L365))
- In milestone push notification types, actions[].actionEntityId holds the milestone value, not an entity id. ([L384](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/notifications/types.ts#L384))
- In WeeklyRotationNotification (store/notifications/types.ts), year/week are an ISO (year, week) pair, not calendar week numbering. ([L629](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/notifications/types.ts#L629))
- WeeklyRotationFeaturedNotification (notifications/types.ts) is sent on the Wednesday rollover and counts listeners whose Weekly Rotation included the artist's tracks in the closed period. ([L634](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/notifications/types.ts#L634))
- In WeeklyRotationFeaturedNotification, entityId is the most-featured track; it is the only one when trackCount is 1. ([L641](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/notifications/types.ts#L641))
- In WeeklyRotationFeaturedNotification, year/week are an ISO (year, week) pair for the reported rotation period. ([L645](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/notifications/types.ts#L645))
- WeeklyRotationFeaturedPushNotification carries a Track when one track was featured, otherwise the artist User whose profile the tap opens. ([L650](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/notifications/types.ts#L650))
- WeeklyArtistRecapNotification (notifications/types.ts) is sent on the Wednesday rollover for the closed week; topCity is absent when no play had a city. ([L660](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/notifications/types.ts#L660))
- In WeeklyArtistRecapNotification, rotationSaveCount counts saves from listeners whose Weekly Rotation included the track. ([L669](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/notifications/types.ts#L669))
- In WeeklyArtistRecapNotification, year/week are a Weekly Rotation ISO (year, week) pair. ([L672](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/notifications/types.ts#L672))
- TrendingGenreNotification (notifications/types.ts) is sent on Friday when the artist's track is in the top 10 of its genre's weekly trending chart. ([L677](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/notifications/types.ts#L677))

### `store/pages/settings/reducer.ts`

- The settings reducer ignores toggling other browser notification settings while browser push is off. ([L112](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/pages/settings/reducer.ts#L112))

### `store/social/tracks/actions.ts`

- shareContest (social/tracks/actions.ts) is separate from shareTrack so analytics and the copied link target the contest page (/{handle}/contest/{slug}), resolved in the saga from the parent track id. ([L124](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/social/tracks/actions.ts#L124))

### `store/ui/share-modal/milestones.ts`

- SHARE_CARD_PLAY_THRESHOLDS and FEATURED_PLAYLIST_NAMES in share-modal/milestones.ts must stay in sync with pedalboard's notifications app, which decides which pushes open the stat card. ([L3](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/store/ui/share-modal/milestones.ts#L3))

### `utils/error.ts`

- getResponseErrorAnalyticsFields in utils/error.ts extracts HTTP status, status text and a truncated body from SDK ResponseErrors because their message is a generic string; it reads the body via response.clone() so other consumers are unaffected and never throws. ([L46](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/error.ts#L46))

### `utils/weeklyRotation.test.ts`

- weeklyRotation.test.ts uses the same cases as TestPeriod in the api repo (weeklyrotation/period_test.go); keep them in sync. ([L13](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/weeklyRotation.test.ts#L13))

### `utils/weeklyRotation.ts`

- getWeeklyRotationPeriod mirrors weeklyrotation.Period in the api repo: ISO (year, week) but rolling over Wednesday 00:00 UTC; the file stays dependency-free because the web SSR bundle imports it. ([L1](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/weeklyRotation.ts#L1))
- getWeeklyRotationQueueSource appends the owner id so your own Weekly Rotation mix and a shared one do not share playback state. ([L41](https://github.com/AudiusProject/apps/blob/b3133cffff63955fb8091c067255b8334b9fd956/packages/common/src/utils/weeklyRotation.ts#L41))
