import {
  ChatBlastAudience,
  ChatMessage,
  Track,
  Playlist,
  User,
  ChatPermission
} from '@audius/sdk'
import { mapValues } from 'lodash'

import { Status } from '~/models/Status'
import { InboxSettingsFormValues } from '~/store'

import { MESSAGE_GROUP_THRESHOLD_MINUTES } from './constants'
import dayjs from './dayjs'

export const CHAT_BLOG_POST_URL =
  'http://support.audius.co/help/How-to-Send-Messages-on-Audius'

const messages = {
  blastTitleFollowers: 'All Followers',
  blastTitleCustomers: 'Purchasers',
  blastTitleRemixers: 'Remix Creators',
  blastTitleCustomers2: 'All Purchasers',
  blastTitleRemixers2: 'Remixed',
  blastTitleCoinHolders: (ticker: string) => `$${ticker} Members`,
  blastFollowersDescription: 'Everyone who follows you.',
  blastCustomersDescription: 'Everyone who has paid for your content.',
  blastRemixersDescription: 'Everyone who has remixed your tracks.',
  blastCoinHoldersDescription: (symbol: string) =>
    `Everyone who holds $${symbol}.`,
  blastCTABase: 'Send a message blast to ',
  blastCTAFollowers: 'each of your followers',
  blastCTACustomers: (audienceContentId?: string) =>
    audienceContentId
      ? 'all purchasers'
      : 'everyone who has purchased your content',
  blastCTARemixers: (audienceContentId?: string) =>
    audienceContentId
      ? 'everyone who remixed this track'
      : 'everyone who has remixed your tracks',
  blastCTACoinHolders: (ticker: string) => `everyone who holds $${ticker}`
}

export const formatGroupChatTitle = (
  users: Array<{ name?: string | null }>,
  maxNames = 2
) => {
  const names = users.map((u) => u.name ?? '').filter(Boolean)
  if (names.length === 0) return 'Group'
  if (names.length <= maxNames) {
    return names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
  }
  const rest = names.length - maxNames
  return `${names.slice(0, maxNames).join(', ')} & ${rest} ${rest === 1 ? 'other' : 'others'}`
}

export const isFirstInSenderRun = (
  message: ChatMessage,
  previousMessage?: ChatMessage
) => {
  if (!previousMessage) return true
  return hasTail(previousMessage, message)
}

export const hasTail = (message: ChatMessage, newMessage?: ChatMessage) => {
  if (!newMessage) return true
  return (
    message.sender_user_id !== newMessage.sender_user_id ||
    dayjs(newMessage.created_at).diff(message.created_at, 'minutes') >=
      MESSAGE_GROUP_THRESHOLD_MINUTES
  )
}

export const isEarliestUnread = ({
  unreadCount,
  lastReadAt,
  currentMessageIndex,
  messages,
  currentUserId
}: {
  unreadCount: number
  lastReadAt?: string
  currentMessageIndex: number
  messages: ChatMessage[]
  currentUserId: string | null
}) => {
  if (unreadCount === 0) {
    return false
  }
  const message = messages[currentMessageIndex]
  const prevMessage = messages[currentMessageIndex + 1]
  const isUnread = !lastReadAt || dayjs(message.created_at).isAfter(lastReadAt)
  const isPreviousMessageUnread =
    prevMessage &&
    (!lastReadAt || dayjs(prevMessage.created_at).isAfter(lastReadAt))
  const isAuthor = message.sender_user_id === currentUserId
  return isUnread && !!prevMessage && !isPreviousMessageUnread && !isAuthor
}

export const chatCanFetchMoreMessages = (
  messagesStatus?: Status | 'PENDING',
  prevCount?: number
) => {
  return !!messagesStatus && messagesStatus !== Status.LOADING && !!prevCount
}

export const matchAudiusLinks = ({
  text,
  hostname
}: {
  text: string
  hostname: string
}) => {
  const linkRegex = new RegExp(
    `https://${hostname.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )}/[^/\\s]+(?:/[^/\\s]+)*(?=\\s|$)`,
    'g'
  )
  const matches: string[] = text.match(linkRegex) ?? []

  return {
    matches
  }
}

export const formatTrackName = ({ track }: { track: Track }) => {
  return `${track.user.name} - ${track.title}`
}

export const formatCollectionName = ({
  collection
}: {
  collection: Playlist
}) => {
  return `${collection.user.name} - ${collection.playlistName}`
}

export const formatUserName = ({ user }: { user: User }) => {
  return user.name
}

export const splitOnNewline = (s: string) => {
  return s.split(/(\n)/).filter(Boolean)
}

export const makeBlastChatId = ({
  audience,
  audienceContentType,
  audienceContentId
}: {
  audience: ChatBlastAudience
  audienceContentType?: 'track' | 'album'
  audienceContentId?: string
}) => {
  return (
    `${audience}` +
    (audienceContentType ? `:${audienceContentType}` : '') +
    (audienceContentId ? `:${audienceContentId}` : '')
  )
}

export const getChatBlastTitle = ({
  audience,
  coinSymbol
}: {
  audience: ChatBlastAudience
  coinSymbol?: string
}) => {
  switch (audience) {
    case ChatBlastAudience.FOLLOWERS:
      return messages.blastTitleFollowers
    case ChatBlastAudience.CUSTOMERS:
      return messages.blastTitleCustomers
    case ChatBlastAudience.REMIXERS:
      return messages.blastTitleRemixers
    case ChatBlastAudience.COIN_HOLDERS:
      return messages.blastTitleCoinHolders(coinSymbol ?? '')
    default:
      return ''
  }
}

export const getChatBlastSecondaryTitle = ({
  audience,
  audienceContentId,
  coinSymbol
}: {
  audience: ChatBlastAudience
  audienceContentId?: string
  coinSymbol?: string
}) => {
  switch (audience) {
    case ChatBlastAudience.FOLLOWERS:
      return messages.blastTitleFollowers
    case ChatBlastAudience.CUSTOMERS:
      return audienceContentId
        ? messages.blastTitleCustomers
        : messages.blastTitleCustomers2
    case ChatBlastAudience.REMIXERS:
      return audienceContentId
        ? messages.blastTitleRemixers2
        : messages.blastTitleRemixers
    case ChatBlastAudience.COIN_HOLDERS:
      return messages.blastTitleCoinHolders(coinSymbol ?? '')
    default:
      return ''
  }
}

export const getChatBlastAudienceDescription = ({
  audience,
  coinSymbol
}: {
  audience: ChatBlastAudience
  coinSymbol?: string
}) => {
  switch (audience) {
    case ChatBlastAudience.FOLLOWERS:
      return messages.blastFollowersDescription
    case ChatBlastAudience.CUSTOMERS:
      return messages.blastCustomersDescription
    case ChatBlastAudience.REMIXERS:
      return messages.blastRemixersDescription
    case ChatBlastAudience.COIN_HOLDERS:
      return messages.blastCoinHoldersDescription(coinSymbol ?? '')
    default:
      return ''
  }
}

export const getChatBlastCTA = ({
  audience,
  audienceContentId,
  coinSymbol
}: {
  audience: ChatBlastAudience
  audienceContentId?: string
  coinSymbol?: string
}) => {
  switch (audience) {
    case ChatBlastAudience.FOLLOWERS:
      return messages.blastCTABase + messages.blastCTAFollowers
    case ChatBlastAudience.CUSTOMERS:
      return (
        messages.blastCTABase + messages.blastCTACustomers(audienceContentId)
      )
    case ChatBlastAudience.REMIXERS:
      return (
        messages.blastCTABase + messages.blastCTARemixers(audienceContentId)
      )
    case ChatBlastAudience.COIN_HOLDERS:
      return (
        messages.blastCTABase + messages.blastCTACoinHolders(coinSymbol ?? '')
      )
    default:
      return ''
  }
}

export const defaultChatPermitMap: InboxSettingsFormValues = {
  [ChatPermission.ALL]: false,
  [ChatPermission.FOLLOWERS]: false,
  [ChatPermission.FOLLOWEES]: false,
  [ChatPermission.VERIFIED]: false
}

export const transformPermitListToMap = (
  permitList: ChatPermission[]
): InboxSettingsFormValues => {
  if (permitList.includes(ChatPermission.ALL)) {
    return mapValues(defaultChatPermitMap, () => true)
  }

  if (permitList.includes(ChatPermission.NONE)) {
    return { ...defaultChatPermitMap }
  }

  return permitList.reduce(
    (acc, permit) => {
      acc[permit as keyof InboxSettingsFormValues] = true
      return acc
    },
    { ...defaultChatPermitMap }
  )
}

export const transformMapToPermitList = (
  permitMap: InboxSettingsFormValues
): ChatPermission[] => {
  if (permitMap[ChatPermission.ALL]) {
    return [ChatPermission.ALL]
  }
  if (Object.values(permitMap).every((value) => !value)) {
    return [ChatPermission.NONE]
  }
  return Object.keys(permitMap).filter(
    (key) => permitMap[key as keyof InboxSettingsFormValues]
  ) as ChatPermission[]
}
