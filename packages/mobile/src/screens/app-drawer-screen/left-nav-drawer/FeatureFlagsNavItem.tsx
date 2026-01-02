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

  // Only show if feature flag access is enabled
  if (!isFeatureFlagAccessEnabled) {
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
