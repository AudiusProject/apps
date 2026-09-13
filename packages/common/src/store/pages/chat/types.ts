import { ChatPermission, type ChatUnreadCountByCategory } from '@audius/sdk'

/**
 * The tab a chat is shown under in the inbox. Chats the user has not
 * categorized yet ("uncategorized") always surface in the Priority tab so
 * that new conversations are never buried without an explicit action.
 */
export enum InboxTab {
  PRIORITY = 'priority',
  GENERAL = 'general'
}

/** Bucket key used for per-category unread counts. */
export type ChatCategoryKey = keyof ChatUnreadCountByCategory

/** Action current user can take to be able to message another user */
export enum ChatPermissionAction {
  /** Permissions haven't loaded yet */
  WAIT,
  /** Current user already can chat */
  NOT_APPLICABLE,
  /** Nothing current user can do (they're blocked or other user has closed inbox) */
  NONE,
  /** Current user can follow user */
  FOLLOW,
  /** Current user can unblock user */
  UNBLOCK,
  /** User is signed out and needs to sign in */
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
