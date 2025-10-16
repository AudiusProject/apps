import { useMemo } from 'react'

import { ChatBlast, ChatBlastAudience, OptionalHashId } from '@audius/sdk'

import {
  useCollection,
  useArtistCoinHoldersCount,
  useCurrentAccountUser,
  usePurchasersCount,
  useRemixersCount,
  useTrack,
  useArtistOwnedCoin
} from '~/api'
import {
  getChatBlastAudienceDescription,
  getChatBlastCTA,
  getChatBlastSecondaryTitle,
  getChatBlastTitle
} from '~/utils'

export const useChatBlastAudienceContent = ({ chat }: { chat: ChatBlast }) => {
  const {
    audience,
    audience_content_id: audienceContentId,
    audience_content_type: audienceContentType
  } = chat

  const decodedContentId = audienceContentId
    ? OptionalHashId.parse(audienceContentId)
    : undefined

  const { data: user } = useCurrentAccountUser()
  const { data: trackTitle } = useTrack(decodedContentId, {
    enabled: !!decodedContentId && audienceContentType === 'track',
    select: (track) => track.title
  })
  const { data: albumTitle } = useCollection(decodedContentId!, {
    enabled: audienceContentType === 'album',
    select: (collection) => collection.playlist_name
  })

  const { data: purchasersCount } = usePurchasersCount(
    {
      contentId: decodedContentId,
      contentType: audienceContentType
    },
    {
      enabled: audience === ChatBlastAudience.CUSTOMERS
    }
  )

  const { data: remixersCount } = useRemixersCount(
    { trackId: decodedContentId },
    { enabled: audience === ChatBlastAudience.REMIXERS }
  )

  const { data: coin } = useArtistOwnedCoin(user?.user_id)
  const coinSymbol = coin?.ticker ?? ''
  const { data: coinHoldersCount } = useArtistCoinHoldersCount({
    enabled: audience === ChatBlastAudience.COIN_HOLDERS
  })

  const audienceCount = useMemo(() => {
    switch (audience) {
      case ChatBlastAudience.FOLLOWERS:
        return user?.follower_count
      case ChatBlastAudience.TIPPERS:
        return user?.supporter_count
      case ChatBlastAudience.CUSTOMERS:
        return purchasersCount
      case ChatBlastAudience.REMIXERS:
        return remixersCount
      case ChatBlastAudience.COIN_HOLDERS:
        return coinHoldersCount
      default:
        return 0
    }
  }, [
    audience,
    user?.follower_count,
    user?.supporter_count,
    purchasersCount,
    remixersCount,
    coinHoldersCount
  ])

  const contentTitle = audienceContentId
    ? audienceContentType === 'track'
      ? trackTitle
      : albumTitle
    : undefined

  const chatBlastTitle = getChatBlastTitle({ audience, coinSymbol })
  const chatBlastSecondaryTitle = getChatBlastSecondaryTitle({
    audience,
    audienceContentId,
    coinSymbol
  })
  const chatBlastAudienceDescription = getChatBlastAudienceDescription({
    audience,
    coinSymbol
  })
  const chatBlastCTA = getChatBlastCTA({
    audience,
    audienceContentId,
    coinSymbol
  })

  return {
    chatBlastTitle,
    chatBlastSecondaryTitle,
    chatBlastAudienceDescription,
    chatBlastCTA,
    contentTitle,
    audienceCount,
    audienceContentId: decodedContentId,
    audienceContentType
  }
}
