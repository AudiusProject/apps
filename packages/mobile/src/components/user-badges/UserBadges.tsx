import { useMemo } from 'react'

import { useUser } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { useTierAndVerifiedForUser } from '@audius/common/store'

import type { IconSize } from '@audius/harmony-native'
import { Flex, IconVerified } from '@audius/harmony-native'
import { IconAudioBadge } from 'app/components/audio-rewards'
import { TokenIcon } from 'app/components/core'
import { env } from 'app/services/env'

type UserBadgesProps = {
  userId: ID
  badgeSize?: IconSize
  mint?: string
  hideFanClubBadge?: boolean
}

export const UserBadges = (props: UserBadgesProps) => {
  const { userId, badgeSize = 's', mint, hideFanClubBadge } = props

  const { data: userData } = useUser(userId, {
    select: (user) => ({
      isVerified: user?.is_verified,
      fanClubBadge: user?.fan_club_badge
    })
  })
  const { isVerified: userIsVerified, fanClubBadge: userFanClubBadge } =
    userData ?? {}
  const { tier } = useTierAndVerifiedForUser(userId)

  const displayMint = useMemo(() => {
    // Priority: explicit mint prop > user's fan_club_badge > null
    if (mint) return mint
    if (userFanClubBadge?.mint) return userFanClubBadge.mint
    return null
  }, [mint, userFanClubBadge?.mint])

  const shouldShowFanClubBadge =
    !!displayMint &&
    displayMint !== env.WAUDIO_MINT_ADDRESS &&
    !hideFanClubBadge

  return (
    <Flex row gap='xs' alignItems='center'>
      {userIsVerified ? <IconVerified size={badgeSize} /> : null}
      <IconAudioBadge tier={tier} size={badgeSize} />
      {shouldShowFanClubBadge ? (
        <TokenIcon logoURI={userFanClubBadge?.logo_uri} size={badgeSize} />
      ) : null}
    </Flex>
  )
}
