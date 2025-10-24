export enum ErrorLevel {
  /**
   * FATAL
   * What to use for: anything that results in app crash / "Something went wrong"
   * These are high prio for on-call to look into, and generally should trigger an alert of some kind.
   * Applies to scenarios that are completely unrecoverable other than to refresh client
   */
  'Fatal' = 'Fatal',

  /**
   * ERROR
   * What to use for: Unexpected breakage but recoverable for the user.
   * e.g. click button but fails & shows error toast. Generally applies things that can be "retried" by the user
   */
  'Error' = 'Error',

  /**
   * WARNING
   * What to use for: Something not ideal but within realm of expected behavior
   * e.g. api call failure
   */
  'Warning' = 'Warning',

  // Misc levels that we generally don't use with sentry since we typically send these to generic console
  'Debug' = 'Debug',
  'Info' = 'Info',
  'Log' = 'Log'
}
export type AdditionalErrorReportInfo = Record<string, unknown>

/**
 * Areas of our app that we want to group sentry logs together in
 * Used to create query-able sentry tags
 */
export enum Feature {
  SignUp = 'sign-up',
  SignIn = 'sign-in',
  Upload = 'upload',
  Playback = 'playback',
  Purchase = 'purchase',
  Comments = 'comments',
  Chats = 'chats',
  Social = 'social',
  Notifications = 'notifications',
  Rewards = 'rewards',
  Edit = 'edit',
  Events = 'events',
  Remixes = 'remixes',
  TanQuery = 'tan-query',
  SendTokens = 'send-tokens',
  ArtistCoins = 'artist-coins'
}

export type ReportToSentryArgs = {
  /**
   * The raw JS `Error` to report to sentry. Note: strings are not allowed;
   * if you don't have an error object to log just create one via new Error('message')
   */
  error: Error
  /**
   * The severity level that we should report to sentry
   * Defaults to ErrorLevel.Error
   */
  level?: ErrorLevel
  /**
   * Any additional info to report (can be any object, but <string, string>)
   * is generally the right way to report.
   */
  additionalInfo?: AdditionalErrorReportInfo
  /**
   * An optional name to assign to the Error
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/name
   */
  name?: string
  /**
   * Adds queryable sentry tags
   * https://docs.sentry.io/platforms/javascript/enriching-events/tags/
   */
  tags?: Record<string, string>
  /**
   * Which core flow of the app the error should be bucketed in
   */
  feature?: Feature
}
