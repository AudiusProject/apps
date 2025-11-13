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
  NETWORK_CUT_ENABLED = 'network_cut_enabled',
  FAST_REFERRAL = 'fast_referral',
  REACT_QUERY_SYNC = 'react_query_sync',
  COLLAPSED_EXPLORE_HEADER = 'collapsed_explore_header',
  LAUNCHPAD_VERIFICATION = 'launchpad_verification'
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
  [FeatureFlags.USDC_PURCHASES]: true,
  [FeatureFlags.FEATURE_FLAG_ACCESS]: false,
  [FeatureFlags.IOS_USDC_PURCHASE_ENABLED]: true,
  [FeatureFlags.BUY_WITH_COINFLOW]: false,
  [FeatureFlags.COINFLOW_OFFRAMP_ENABLED]: false,
  [FeatureFlags.NETWORK_CUT_ENABLED]: false,
  [FeatureFlags.FAST_REFERRAL]: false,
  [FeatureFlags.REACT_QUERY_SYNC]: false,
  [FeatureFlags.COLLAPSED_EXPLORE_HEADER]: false,
  [FeatureFlags.LAUNCHPAD_VERIFICATION]: true
}
