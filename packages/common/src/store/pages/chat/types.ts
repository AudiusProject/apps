import { ChatPermission, type ChatUnreadCountByCategory } from '@audius/sdk'

export enum InboxTab {
  PRIORITY = 'priority',
  GENERAL = 'general'
}

export type ChatCategoryKey = keyof ChatUnreadCountByCategory

export enum ChatPermissionAction {
  WAIT,
  NOT_APPLICABLE,
  NONE,
  FOLLOW,
  UNBLOCK,
  SIGN_UP
}

export type ChatMessageTileProps = {
  link: string
  chatId: string
  messageId: string
  styles?: any
  onEmpty?: () => void
  onSuccess?: () => void
  className?: string
}

export class ChatWebsocketError extends Error {
  constructor(
    public code: string = 'UNKNOWN',
    public url?: string
  ) {
    super(`Chat Websocket Error, code: ${code}`)
  }
}

export type InboxSettingsFormValues = {
  [ChatPermission.ALL]: boolean
  [ChatPermission.FOLLOWEES]: boolean
  [ChatPermission.FOLLOWERS]: boolean
  [ChatPermission.VERIFIED]: boolean
}
