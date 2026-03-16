import { ChatPermission } from '@audius/sdk/services'

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
