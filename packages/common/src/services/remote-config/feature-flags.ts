import { Environment } from '../env'

/* FeatureFlags must be lowercase snake case */
export enum FeatureFlags {
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
  LAUNCHPAD_VERIFICATION = 'launchpad_verification',
  NEW_THEME_MODEL = 'new_theme_model'
}

type FlagDefaults = Record<FeatureFlags, boolean>

export const environmentFlagDefaults: Record<
  Environment,
  Partial<FlagDefaults>
> = {
  development: {},
  production: {}
}

/**
 * If optimizely errors, these default values are used.
 */
export const flagDefaults: FlagDefaults = {
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
  [FeatureFlags.LAUNCHPAD_VERIFICATION]: true,
  [FeatureFlags.NEW_THEME_MODEL]: false
}

/**
 * Minimum app version required for a flag to be enabled.
 * Flags with a minVersion are only enabled when appVersion >= minVersion.
 */
export const featureFlagMinVersions: Partial<Record<FeatureFlags, string>> = {
  [FeatureFlags.NEW_THEME_MODEL]: '1.5.165'
}

/** Returns true if actual >= min (semver-style comparison) */
export const isVersionAtLeast = (actual: string, min: string): boolean => {
  const a = actual.split('.').map((n) => parseInt(n, 10) || 0)
  const m = min.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(a.length, m.length); i++) {
    const av = a[i] ?? 0
    const mv = m[i] ?? 0
    if (av > mv) return true
    if (av < mv) return false
  }
  return true
}
