// NOTE: No imports allowed - quicktype is not yet able to track imports!

export type ValidateCanChatRPC = {
  method: 'user.validate_can_chat'
  params: {
    receiver_user_ids: string[]
  }
}

export type ChatBlastRPC = {
  method: 'chat.blast'
  params: {
    blast_id: string
    audience: ChatBlastAudience
    audience_content_type?: 'track' | 'album' // if targeting buyers / remixers of a specific track or album
    audience_content_id?: string // if targeting buyers / remixers of a specific track or album
    message: string
  }
}

export type ChatCreateRPC = {
  method: 'chat.create'
  params: {
    chat_id: string
    invites: Array<{
      user_id: string
      invite_code: string
    }>
  }
}

export type ChatDeleteRPC = {
  method: 'chat.delete'
  params: {
    chat_id: string
  }
}

export type ChatInviteRPC = {
  method: 'chat.invite'
  params: {
    chat_id: string
    invites: Array<{
      user_id: string
      invite_code: string
    }>
  }
}

export type ChatMessageRPC = {
  method: 'chat.message'
  params: {
    chat_id: string
    message_id: string
    message: string
    parent_message_id?: string
    is_plaintext?: boolean
    audience?: ChatBlastAudience
  }
}

export type ChatReactRPC = {
  method: 'chat.react'
  params: {
    chat_id: string
    message_id: string
    reaction: string | null
  }
}

export type ChatReadRPC = {
  method: 'chat.read'
  params: {
    chat_id: string
  }
}

export type ChatReadAllRPC = {
  method: 'chat.read_all'
  params: Record<string, never>
}

export type ChatBlockRPC = {
  method: 'chat.block'
  params: {
    user_id: string
  }
}

export type ChatUnblockRPC = {
  method: 'chat.unblock'
  params: {
    user_id: string
  }
}

export type ChatPermitRPC = {
  method: 'chat.permit'
  params: {
    permit: ChatPermission
    permit_list: ChatPermission[]
    allow?: boolean
  }
}

export type RPCPayloadRequest =
  | ChatBlastRPC
  | ChatCreateRPC
  | ChatDeleteRPC
  | ChatInviteRPC
  | ChatMessageRPC
  | ChatReactRPC
  | ChatReadRPC
  | ChatReadAllRPC
  | ChatBlockRPC
  | ChatUnblockRPC
  | ChatPermitRPC
  | ValidateCanChatRPC

export type RPCPayload = RPCPayloadRequest & {
  current_user_id: string
  timestamp: number
}

export type RPCMethod = RPCPayload['method']

export type UserChat = {
  // User agnostic
  chat_id: string
  last_message: string
  last_message_at: string
  last_message_is_plaintext: boolean
  chat_members: Array<{ user_id: string }>
  recheck_permissions: boolean

  // User specific
  invite_code: string
  unread_message_count: number
  last_read_at: string
  cleared_history_at: string

  // If blast:
  is_blast: false
  audience: ChatBlastAudience
  audience_content_id?: string
  audience_content_type?: string
}

export type ChatMessageReaction = {
  user_id: string
  created_at: string
  reaction: string
}

export type ChatMessageNullableReaction =
  | ChatMessageReaction
  | {
      user_id: string
      created_at: string
      reaction: null
    }

export type ChatMessage = {
  message_id: string
  sender_user_id: string
  created_at: string
  message: string
  is_plaintext: boolean
  audience?: ChatBlastAudience
  reactions: ChatMessageReaction[]
}

export type ChatInvite = {
  user_id: string
  invite_code: string
}

type ChatBlastBase = {
  chat_id: string
  audience: ChatBlastAudience
  audience_content_id?: string
  audience_content_type?: 'track' | 'album'
}

// Return type of getNewBlasts
export type UpgradableChatBlast = ChatBlastBase & {
  pending_chat_id: string // chat_id to be created when upgrading to UserChat
  from_user_id: number
  plaintext: string
  created_at: string
  blast_id: string
}

// Client-side chat blast
export type ChatBlast = ChatBlastBase & {
  is_blast: true
  last_message_at: string
}

export type ValidatedChatPermissions = {
  user_id: string
  permits: ChatPermission // depricated: use multi-value permit_list in future
  permit_list: ChatPermission[]
  current_user_has_permission: boolean
}

/**
 * Defines who the user allows to message them
 */
export enum ChatPermission {
  ALL = 'all',
  TIPPEES = 'tippees',
  TIPPERS = 'tippers',
  FOLLOWEES = 'followees',
  FOLLOWERS = 'followers',
  VERIFIED = 'verified',
  NONE = 'none'
}

export enum ChatBlastAudience {
  FOLLOWERS = 'follower_audience',
  TIPPERS = 'tipper_audience',
  REMIXERS = 'remixer_audience',
  CUSTOMERS = 'customer_audience',
  COIN_HOLDERS = 'coin_holder_audience'
}

export type CommsResponse = {
  health: {
    is_healthy: boolean
  }
  summary?: {
    prev_cursor: string
    prev_count: number
    next_cursor: string
    next_count: number
    total_count: number
  }
  // Overridden in client types but left as any for the server.
  // quicktype/golang doesn't do well with union types
  data: any
}

export type ChatWebsocketEventData = {
  rpc: RPCPayload
  metadata: {
    userId: string
    senderUserId: string
    receiverUserId: string
    timestamp: string
  }
}
