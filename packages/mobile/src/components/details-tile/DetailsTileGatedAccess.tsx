import { useArtistCoin } from '@audius/common/api'
import type {
  ID,
  AccessConditions,
  TokenGatedConditions
} from '@audius/common/models'
import {
  isContentFollowGated,
  isContentTipGated,
  isContentSpecialAccess,
  isContentUSDCPurchaseGated,
  isContentTokenGated
} from '@audius/common/models'
import { PurchaseableContentType } from '@audius/common/store'
import type { ViewStyle } from 'react-native'

import { DetailsTileHasAccess } from './DetailsTileHasAccess'
import { DetailsTileNoAccess } from './DetailsTileNoAccess'

type DetailsTileGatedAccessProps = {
  trackId: ID
  streamConditions: AccessConditions
  isOwner: boolean
  hasStreamAccess: boolean
  style?: ViewStyle
  contentType: PurchaseableContentType
}

export const DetailsTileGatedAccess = ({
  trackId,
  streamConditions,
  isOwner,
  hasStreamAccess,
  style,
  contentType
}: DetailsTileGatedAccessProps) => {
  const isTokenGated = isContentTokenGated(streamConditions)
  const { data: token } = useArtistCoin(
    (streamConditions as TokenGatedConditions)?.token_gate?.token_mint,
    { enabled: isTokenGated }
  )
  const shouldDisplay =
    isContentFollowGated(streamConditions) ||
    isContentTipGated(streamConditions) ||
    isContentTokenGated(streamConditions) ||
    isContentSpecialAccess(streamConditions) ||
    isContentUSDCPurchaseGated(streamConditions)

  if (!shouldDisplay) return null

  if (hasStreamAccess) {
    return (
      <DetailsTileHasAccess
        streamConditions={streamConditions}
        isOwner={isOwner}
        style={style}
        contentType={contentType}
        token={token}
      />
    )
  }

  return (
    <DetailsTileNoAccess
      trackId={trackId}
      // Currently only special-access tracks are supported
      contentType={PurchaseableContentType.TRACK}
      streamConditions={streamConditions}
      token={token}
      style={style}
    />
  )
}
