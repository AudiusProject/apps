import { ChatBlast, ChatBlastAudience } from '@audius/sdk'

import {
  useGetCurrentUserId,
  useGetFollowers,
  useGetPurchasers,
  useGetRemixers,
  useSupporters
} from '~/api'
import { UserMetadata } from '~/models'

export const useAudienceUsers = (chat: ChatBlast, limit?: number) => {
  const { data: currentUserId } = useGetCurrentUserId({})

  const { data: followers } = useGetFollowers({
    userId: currentUserId!,
    limit
  })
  const { data: supporters } = useSupporters(
    { userId: currentUserId, pageSize: limit },
    { enabled: chat.audience === ChatBlastAudience.TIPPERS }
  )
  const { data: purchasers } = useGetPurchasers({
    userId: currentUserId!,
    contentId: chat.audience_content_id
      ? parseInt(chat.audience_content_id)
      : undefined,
    contentType: chat.audience_content_type,
    limit
  })
  const { data: remixers } = useGetRemixers({
    userId: currentUserId!,
    trackId: chat.audience_content_id,
    limit
  })

  let users: UserMetadata[] = []
  switch (chat.audience) {
    case ChatBlastAudience.FOLLOWERS:
      users = followers ?? []
      break
    case ChatBlastAudience.TIPPERS:
      users = supporters?.map((supporter) => supporter.sender) ?? []
      break
    case ChatBlastAudience.CUSTOMERS:
      users = purchasers ?? []
      break
    case ChatBlastAudience.REMIXERS:
      users = remixers ?? []
      break
  }

  return users
}
