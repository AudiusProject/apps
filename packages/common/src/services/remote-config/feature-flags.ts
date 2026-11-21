import { Environment } from '../env'

export enum FeatureFlags {
  VERIFY_HANDLE_WITH_TIKTOK = 'verify_handle_with_tiktok',
  VERIFY_HANDLE_WITH_TWITTER = 'verify_handle_with_twitter',
  VERIFY_HANDLE_WITH_INSTAGRAM = 'verify_handle_with_instagram',
  USDC_PURCHASES = 'usdc_purchases',
  FEATURE_FLAG_ACCESS = 'feature_flag_access',
  BUY_WITH_COINFLOW = 'buy_with_coinflow',
  COINFLOW_OFFRAMP_ENABLED = 'coinflow_offramp_enabled',
  NETWORK_CUT_ENABLED = 'network_cut_enabled',
  FAST_REFERRAL = 'fast_referral',
  REACT_QUERY_SYNC = 'react_query_sync',
  COLLAPSED_EXPLORE_HEADER = 'collapsed_explore_header',
  LAUNCHPAD_VERIFICATION = 'launchpad_verification',
  FAN_CLUB_TEXT_POST_POSTING = 'fan_club_text_post_posting',
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
    [FeatureFlags.FAN_CLUB_TEXT_POST_POSTING]: true,
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

export const flagDefaults: FlagDefaults = {
  [FeatureFlags.VERIFY_HANDLE_WITH_TIKTOK]: false,
  [FeatureFlags.VERIFY_HANDLE_WITH_TWITTER]: false,
  [FeatureFlags.VERIFY_HANDLE_WITH_INSTAGRAM]: false,
  [FeatureFlags.USDC_PURCHASES]: true,
  [FeatureFlags.FEATURE_FLAG_ACCESS]: false,
  [FeatureFlags.BUY_WITH_COINFLOW]: false,
  [FeatureFlags.COINFLOW_OFFRAMP_ENABLED]: false,
  [FeatureFlags.NETWORK_CUT_ENABLED]: false,
  [FeatureFlags.FAST_REFERRAL]: false,
  [FeatureFlags.REACT_QUERY_SYNC]: false,
  [FeatureFlags.COLLAPSED_EXPLORE_HEADER]: false,
  [FeatureFlags.LAUNCHPAD_VERIFICATION]: true,
  [FeatureFlags.FAN_CLUB_TEXT_POST_POSTING]: false,
  [FeatureFlags.QUEUE_NEW_FEATURE_BADGE]: false,
  [FeatureFlags.WEEKLY_ROTATION]: true,
  [FeatureFlags.TRACK_ROWS]: false,
  [FeatureFlags.NOW_PLAYING_COMMENTS]: true,
  [FeatureFlags.TRACK_TILE_WAVEFORM]: false,
  [FeatureFlags.NOW_PLAYING_WAVEFORM]: true,
  [FeatureFlags.MOBILE_MANAGER_MODE]: false,
  [FeatureFlags.BULK_TRACK_EDIT]: false,
  [FeatureFlags.WEEKLY_ARTIST_RECAP]: false,
  [FeatureFlags.TRACK_FEEDBACK_REQUESTS]: false,
  [FeatureFlags.GROUP_MESSAGES]: false,
  [FeatureFlags.DASHBOARD_TOP_CITIES]: false,
  [FeatureFlags.TRENDING_GENRE_NOTIFICATION]: false
}
