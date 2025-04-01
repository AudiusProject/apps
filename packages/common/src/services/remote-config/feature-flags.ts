import { Environment } from '../env'

/* FeatureFlags must be lowercase snake case */
export enum FeatureFlags {
  BUY_AUDIO_COINBASE_ENABLED = 'buy_audio_coinbase_enabled',
  BUY_AUDIO_STRIPE_ENABLED = 'buy_audio_stripe_enabled',
  VERIFY_HANDLE_WITH_TIKTOK = 'verify_handle_with_tiktok',
  VERIFY_HANDLE_WITH_TWITTER = 'verify_handle_with_twitter',
  VERIFY_HANDLE_WITH_INSTAGRAM = 'verify_handle_with_instagram',
  USDC_PURCHASES = 'usdc_purchases',
  FEATURE_FLAG_ACCESS = 'feature_flag_access',
  IOS_USDC_PURCHASE_ENABLED = 'ios_usdc_purchase_enabled',
  BUY_WITH_COINFLOW = 'buy_with_coinflow',
  COINFLOW_OFFRAMP_ENABLED = 'coinflow_offramp_enabled',
  TIKTOK_NATIVE_AUTH = 'tiktok_native_auth',
  COMMENTS_ENABLED = 'comments_enabled',
  COMMENT_POSTING_ENABLED = 'comment_posting_enabled',
  PAID_SCHEDULED = 'paid_scheduled',
  NETWORK_CUT_ENABLED = 'network_cut_enabled',
  SOCIAL_SIGNUP = 'social_signup',
  RIGHTS_AND_COVERS = 'rights_and_covers',
  GUEST_CHECKOUT = 'guest_checkout',
  TRACK_AUDIO_REPLACE = 'track_audio_replace',
  OWN_YOUR_FANS = 'own_your_fans',
  FAST_REFERRAL = 'fast_referral',
  REACT_QUERY_SYNC = 'react_query_sync',
  TRACK_REPLACE_DOWNLOADS = 'track_replace_downloads',
  CLAIM_ALL_REWARDS_TILE = 'claim_all_rewards_tile',
  RECENT_COMMENTS = 'recent_comments',
  DOWNLOAD_ALL_TRACK_FILES = 'download_all_track_files'
}

type FlagDefaults = Record<FeatureFlags, boolean>

export const environmentFlagDefaults: Record<
  Environment,
  Partial<FlagDefaults>
> = {
  development: {},
  staging: {},
  production: {}
}

/**
 * If optimizely errors, these default values are used.
 */
export const flagDefaults: FlagDefaults = {
  [FeatureFlags.BUY_AUDIO_COINBASE_ENABLED]: false,
  [FeatureFlags.BUY_AUDIO_STRIPE_ENABLED]: false,
  [FeatureFlags.VERIFY_HANDLE_WITH_TIKTOK]: false,
  [FeatureFlags.VERIFY_HANDLE_WITH_TWITTER]: false,
  [FeatureFlags.VERIFY_HANDLE_WITH_INSTAGRAM]: false,
  [FeatureFlags.USDC_PURCHASES]: false,
  [FeatureFlags.FEATURE_FLAG_ACCESS]: false,
  [FeatureFlags.IOS_USDC_PURCHASE_ENABLED]: true,
  [FeatureFlags.BUY_WITH_COINFLOW]: false,
  [FeatureFlags.COINFLOW_OFFRAMP_ENABLED]: false,
  [FeatureFlags.TIKTOK_NATIVE_AUTH]: true,
  [FeatureFlags.PAID_SCHEDULED]: false,
  [FeatureFlags.COMMENTS_ENABLED]: false,
  [FeatureFlags.COMMENT_POSTING_ENABLED]: false,
  [FeatureFlags.GUEST_CHECKOUT]: false,
  [FeatureFlags.NETWORK_CUT_ENABLED]: false,
  [FeatureFlags.SOCIAL_SIGNUP]: false,
  [FeatureFlags.RIGHTS_AND_COVERS]: false,
  [FeatureFlags.TRACK_AUDIO_REPLACE]: false,
  [FeatureFlags.OWN_YOUR_FANS]: false,
  [FeatureFlags.FAST_REFERRAL]: false,
  [FeatureFlags.REACT_QUERY_SYNC]: false,
  [FeatureFlags.TRACK_REPLACE_DOWNLOADS]: false,
  [FeatureFlags.CLAIM_ALL_REWARDS_TILE]: true,
  [FeatureFlags.RECENT_COMMENTS]: false,
  [FeatureFlags.DOWNLOAD_ALL_TRACK_FILES]: false
}
