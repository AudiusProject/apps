import { Environment } from '../env'

/* FeatureFlags must be lowercase snake case */
export enum FeatureFlags {
  USDC_PURCHASES = 'usdc_purchases',
  FEATURE_FLAG_ACCESS = 'feature_flag_access',
  BUY_WITH_COINFLOW = 'buy_with_coinflow',
  COINFLOW_OFFRAMP_ENABLED = 'coinflow_offramp_enabled',
  QUEUE_NEW_FEATURE_BADGE = 'queue_new_feature_badge',
  WEEKLY_ROTATION = 'weekly_rotation',
  TRACK_ROWS = 'track_rows',
  NOW_PLAYING_COMMENTS = 'now_playing_comments',
  TRACK_TILE_WAVEFORM = 'track_tile_waveform',
  NOW_PLAYING_WAVEFORM = 'now_playing_waveform',
  MOBILE_MANAGER_MODE = 'mobile_manager_mode',
  BULK_TRACK_EDIT = 'bulk_track_edit',
  WEEKLY_ARTIST_RECAP = 'weekly_artist_recap',
  TRACK_FEEDBACK_REQUESTS = 'track_feedback_requests',
  GROUP_MESSAGES = 'group_messages',
  DASHBOARD_TOP_CITIES = 'dashboard_top_cities',
  TRENDING_GENRE_NOTIFICATION = 'trending_genre_notification'
}

type FlagDefaults = Record<FeatureFlags, boolean>

export const environmentFlagDefaults: Record<
  Environment,
  Partial<FlagDefaults>
> = {
  development: {
    [FeatureFlags.TRACK_TILE_WAVEFORM]: true,
    [FeatureFlags.NOW_PLAYING_WAVEFORM]: true,
    [FeatureFlags.MOBILE_MANAGER_MODE]: true,
    [FeatureFlags.BULK_TRACK_EDIT]: true,
    [FeatureFlags.WEEKLY_ARTIST_RECAP]: true,
    [FeatureFlags.TRACK_FEEDBACK_REQUESTS]: true,
    [FeatureFlags.GROUP_MESSAGES]: true,
    [FeatureFlags.DASHBOARD_TOP_CITIES]: true,
    [FeatureFlags.TRENDING_GENRE_NOTIFICATION]: true
  },
  production: {}
}

/**
 * If optimizely errors, these default values are used.
 */
export const flagDefaults: FlagDefaults = {
  [FeatureFlags.USDC_PURCHASES]: true,
  [FeatureFlags.FEATURE_FLAG_ACCESS]: false,
  [FeatureFlags.BUY_WITH_COINFLOW]: false,
  [FeatureFlags.COINFLOW_OFFRAMP_ENABLED]: false,
  [FeatureFlags.QUEUE_NEW_FEATURE_BADGE]: false,
  // Default on so shared links render before the Optimizely datafile loads;
  // the remote flag is the kill switch.
  [FeatureFlags.WEEKLY_ROTATION]: true,
  // Dense track rows instead of tiles. Default off: an Optimizely false falls
  // through to this default, so only a code default of false can turn it off.
  [FeatureFlags.TRACK_ROWS]: false,
  // Timestamped comments as markers and bubbles on the Now Playing scrubber.
  // Default on; the remote flag is the kill switch.
  [FeatureFlags.NOW_PLAYING_COMMENTS]: true,
  // Waveform with timestamped comment avatars on desktop web track tiles.
  [FeatureFlags.TRACK_TILE_WAVEFORM]: false,
  // Waveform scrubber with comment avatars in the mobile Now Playing drawer.
  [FeatureFlags.NOW_PLAYING_WAVEFORM]: true,
  // Account switcher and manager settings on mobile. Switching back out and
  // the manager-mode restrictions stay on regardless of this flag.
  [FeatureFlags.MOBILE_MANAGER_MODE]: false,
  // Multi-select and bulk edit on the Artist Dashboard tracks table.
  [FeatureFlags.BULK_TRACK_EDIT]: false,
  // Weekly recap notification tile for artists (plays, followers, top city,
  // saves).
  [FeatureFlags.WEEKLY_ARTIST_RECAP]: false,
  // "Looking for feedback" toggle, badge, and Explore section.
  [FeatureFlags.TRACK_FEEDBACK_REQUESTS]: false,
  // Creating group DMs. Existing groups always render.
  [FeatureFlags.GROUP_MESSAGES]: false,
  // Top cities card on the web Artist Dashboard.
  [FeatureFlags.DASHBOARD_TOP_CITIES]: false,
  // Friday tile for artists whose track is top 10 in its genre chart.
  [FeatureFlags.TRENDING_GENRE_NOTIFICATION]: false
}
