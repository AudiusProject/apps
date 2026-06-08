import React from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'

import { IconEmbed } from '@audius/harmony-native'

import { LeftNavLink } from './LeftNavLink'

const messages = {
  featureFlags: 'Feature Flags'
}

export const FeatureFlagsNavItem = () => {
  const { isEnabled: isFeatureFlagAccessEnabled } = useFeatureFlag(
    FeatureFlags.FEATURE_FLAG_ACCESS
  )

  // Debug builds (e.g. `npm run ios:prod` on simulator) use production env/Optimizely
  // defaults where `feature_flag_access` is off — still expose overrides for local dev.
  const showFeatureFlags = isFeatureFlagAccessEnabled || __DEV__

  if (!showFeatureFlags) {
    return null
  }

  return (
    <LeftNavLink
      icon={IconEmbed}
      label={messages.featureFlags}
      to='FeatureFlagOverride'
    />
  )
}
