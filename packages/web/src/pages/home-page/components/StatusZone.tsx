import { useCallback, useEffect, useState } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { Flex } from '@audius/harmony'

import { ProfileCompletionHeroCard } from 'components/profile-progress/components/ProfileCompletionHeroCard'

import { QuickLinks } from './QuickLinks'
import { RewardsSummaryCard } from './RewardsSummaryCard'

const dismissalKey = (userId: number | null | undefined) =>
  userId ? `audius-home-profile-meter-dismissed-${userId}` : null

const useHomeProfileMeterDismissal = () => {
  const { data: currentUserId } = useCurrentUserId()
  const key = dismissalKey(currentUserId)
  const [isDismissed, setIsDismissed] = useState<boolean>(false)

  useEffect(() => {
    if (!key) {
      setIsDismissed(false)
      return
    }
    try {
      setIsDismissed(window.localStorage.getItem(key) === 'true')
    } catch {
      setIsDismissed(false)
    }
  }, [key])

  const onDismiss = useCallback(() => {
    if (!key) return
    try {
      window.localStorage.setItem(key, 'true')
    } catch {
      // localStorage may be unavailable; fall back to in-memory state
    }
    setIsDismissed(true)
  }, [key])

  return { isDismissed, onDismiss }
}

type StatusZoneProps = {
  variant: 'desktop' | 'mobile'
}

export const StatusZone = ({ variant }: StatusZoneProps) => {
  const { isDismissed, onDismiss } = useHomeProfileMeterDismissal()

  if (variant === 'mobile') {
    // Mobile: skip RewardsSummaryCard + ProfileCompletionHeroCard; rewards
    // surfaces as a pill in QuickLinks instead.
    return (
      <Flex column gap='l' w='100%'>
        <QuickLinks showRewardsPill />
      </Flex>
    )
  }

  return (
    <Flex column gap='l' w='100%'>
      <RewardsSummaryCard />
      <ProfileCompletionHeroCard
        isDismissed={isDismissed}
        onDismiss={onDismiss}
        forceVisible
      />
      <QuickLinks />
    </Flex>
  )
}
