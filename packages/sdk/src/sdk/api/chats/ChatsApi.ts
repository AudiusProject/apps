import EventEmitter from 'events'

import * as secp from '@noble/secp256k1'
import { base64 } from '@scure/base'
import WebSocket from 'isomorphic-ws'
import type TypedEmitter from 'typed-emitter'
import { ulid } from 'ulid'

import type { AudiusWalletClient } from '../../services/AudiusWalletClient'
import type { LoggerService } from '../../services/Logger'
import type { EventEmitterTarget } from '../../utils/EventEmitterTarget'
import { CryptoUtils } from '../../utils/crypto'
import { encodeHashId } from '../../utils/hashId'
import { uniqBy } from '../../utils/objectUtils'
import { parseParams } from '../../utils/parseParams'
import {
  BaseAPI,
  Configuration,
  HTTPQuery,
  RequestOpts
} from '../generated/default'

import {
  ChatBlastMessageRequest,
  ChatBlastMessageRequestSchema,
  ChatBlockRequest,
  ChatBlockRequestSchema,
  ChatCreateRequest,
  ChatCreateRequestSchema,
  ChatDeleteRequest,
  ChatDeleteRequestSchema,
  ChatEvents,
  ChatGetAllRequest,
  ChatGetAllRequestSchema,
  ChatGetBlockersRequest,
  ChatGetBlockersRequestSchema,
  ChatGetMessagesRequest,
  ChatGetMessagesRequestSchema,
  ChatGetPermissionRequest,
  ChatGetPermissionRequestSchema,
  ChatGetRequest,
  ChatGetRequestSchema,
  ChatGetUnreadCountRequest,
  ChatGetUnreadCountRequestSchema,
  ChatInviteRequest,
  ChatInviteRequestSchema,
  ChatMessageRequest,
  ChatMessageRequestSchema,
  ChatPermitRequest,
  ChatPermitRequestSchema,
  ChatReactRequest,
  ChatReactRequestSchema,
  ChatReadRequest,
  ChatReadRequestSchema,
  ChatUnfurlRequest,
  ChatUnfurlRequestSchema,
  TypedCommsResponse,
  UnfurlResponse
} from './clientTypes'
import {
  type ChatCreateRPC,
  type ChatInvite,
  type ChatMessage,
  type ChatWebsocketEventData,
  type RPCPayloadRequest,
  type UpgradableChatBlast,
  type UserChat,
  type ValidatedChatPermissions,
  ChatBlastAudience,
  ChatPermission
} from './serverTypes'

const GENERIC_MESSAGE_ERROR = 'Error: this message cannot be displayed'

export class ChatsApi
  extends BaseAPI
  implements EventEmitterTarget<ChatEvents>
{
  /**
   * A map of chatId => chatSecret so we don't have to repeatedly fetch it
   */
  private chatSecrets: Record<string, Uint8Array> = {}
  /**
   * A map of userId => publicKey promise to cache and deduplicate public key requests
   */
  private publicKeyCache: Record<string, Promise<Uint8Array>> = {}
  /**
   * An event emitter that's used for consumers to listen for chat events
   */
  private readonly eventEmitter: TypedEmitter<ChatEvents>

  /**
   * Proxy to the event emitter addListener
   */
  public addEventListener
  /**
   * Proxy to the event emitter removeListener
   */
  public removeEventListener

  constructor(
    config: Configuration,
    private readonly audiusWalletClient: AudiusWalletClient,
    private readonly logger: LoggerService
  ) {
    super(config)
    this.eventEmitter = new EventEmitter() as TypedEmitter<ChatEvents>
    this.addEventListener = this.eventEmitter.addListener.bind(
      this.eventEmitter
    )
    this.removeEventListener = this.eventEmitter.removeListener.bind(
      this.eventEmitter
    )

    this.logger = logger.createPrefixedLogger('[chats-api]')
  }

  // #region QUERY

  /**
   * Establishes a websocket connection for listening to chat events.
   * @param params.currentUserId the user to listen for chat events for
   */
  public async listen() {
    await this.createWebsocket(this.configuration.basePath)
  }

  /**
   * Gets a single chat
   * @param params.chatId the chat to get
   * @param params.currentUserId the user to act on behalf of
   * @returns the chat response
   */
  public async get(params: ChatGetRequest) {
    const { chatId, currentUserId } = await parseParams(
      'get',
      ChatGetRequestSchema
    )(params)
    const response = await this.getRaw(chatId, currentUserId)
    return {
      ...response,
      data: response.data
        ? await this.decryptLastChatMessage(response.data)
        : response.data
    }
  }

  /**
   * Gets a list of chats
   * @param params.limit the max number of chats to get
   * @param params.before a timestamp cursor for pagination
   * @param params.after a timestamp cursor for pagination
   * @param params.userId the user to act on behalf of
   * @returns the chat list response
   */
  public async getAll(params?: ChatGetAllRequest) {
    const { userId, limit, before, after } = await parseParams(
      'getAll',
      ChatGetAllRequestSchema
    )(params)

    // Get new blasts and upgrade them to chats
    this.upgradeBlasts(userId)

    const path = `/comms/chats`
    const query: HTTPQuery = {
      timestamp: new Date().getTime()
    }
    if (limit) {
      query.limit = limit
    }
    if (before) {
      query.before = before
    }
    if (after) {
      query.after = after
    }
    if (userId) {
      query.current_user_id = userId
    }
    const response = await this.signAndSendRequest({
      method: 'GET',
      headers: {},
      path,
      query
    })
    const json = (await response.json()) as TypedCommsResponse<UserChat[]>

    const decrypted = await Promise.all(
      json.data.map(async (c) => await this.decryptLastChatMessage(c))
    )
    return {
      ...json,
      data: decrypted
    }
  }

  /**
   * Gets a list of messages
   * @param params.chatId the chat to get messages for
   * @param params.before a timestamp cursor for pagination
   * @param params.after a timestamp cursor for pagination
   * @param params.currentUserId the user to act on behalf of
   * @returns the messages list response
   */
  public async getMessages(
    params: ChatGetMessagesRequest
  ): Promise<TypedCommsResponse<ChatMessage[]>> {
    const { currentUserId, chatId, isBlast, limit, before, after } =
      await parseParams('getMessages', ChatGetMessagesRequestSchema)(params)

    let sharedSecret: Uint8Array
    if (!isBlast) {
      try {
        sharedSecret = await this.getChatSecret(chatId)
      } catch (e) {
        this.logger.error("[audius-sdk] Couldn't get chat secret", e)
        throw new Error("[audius-sdk] Couldn't get chat secret")
      }
    }
    const path = `/comms/chats/${chatId}/messages`
    const query: HTTPQuery = {
      timestamp: new Date().getTime()
    }
    if (isBlast) {
      query.is_blast = isBlast
    }
    if (limit) {
      query.limit = limit
    }
    if (before) {
      query.before = before
    }
    if (after) {
      query.after = after
    }
    if (currentUserId) {
      query.current_user_id = currentUserId
    }
    const response = await this.signAndSendRequest({
      method: 'GET',
      headers: {},
      path,
      query
    })
    const json = (await response.json()) as TypedCommsResponse<ChatMessage[]>
    const decrypted = await Promise.all(
      json.data.map(async (m) => ({
        ...m,
        message: m.is_plaintext
          ? m.message
          : await CryptoUtils.decryptString(
              sharedSecret,
              base64.decode(m.message)
            ).catch((e) => {
              this.logger.error(
                "[audius-sdk]: Error: Couldn't decrypt chat message",
                m,
                e
              )
              return GENERIC_MESSAGE_ERROR
            })
      }))
    )
    return {
      ...json,
      data: decrypted
    }
  }

  /**
   * Gets a list of chat blasts for which chats haven't been created yet
   * @returns the blast messages list response
   */
  public async getBlasts() {
    const query: HTTPQuery = {
      timestamp: new Date().getTime()
    }
    const res = await this.signAndSendRequest({
      method: 'GET',
      path: `/comms/blasts`,
      headers: {},
      query
    })
    return (await res.json()) as TypedCommsResponse<UpgradableChatBlast[]>
  }

  /**
   * Gets the total unread message count for a user
   * @param params.currentUserId the user to act on behalf of
   * @returns the unread count response
   */
  public async getUnreadCount(params?: ChatGetUnreadCountRequest) {
    const parsedArgs = await parseParams(
      'getUnreadCount',
      ChatGetUnreadCountRequestSchema
    )(params)
    const query: HTTPQuery = {
      timestamp: new Date().getTime()
    }
    if (parsedArgs?.currentUserId) {
      query.current_user_id = parsedArgs.currentUserId
    }
    const res = await this.signAndSendRequest({
      method: 'GET',
      path: `/comms/chats/unread`,
      headers: {},
      query
    })
    return (await res.json()) as TypedCommsResponse<number>
  }

  /**
   * Gets the permission settings of the given users
   * @param params.userIds the users to fetch permissions of
   * @param params.currentUserId the user to act on behalf of
   * @returns the permissions response
   */
  public async getPermissions(params: ChatGetPermissionRequest) {
    const query: HTTPQuery = {
      timestamp: new Date().getTime()
    }
    const { userIds, currentUserId } = await parseParams(
      'getPermissions',
      ChatGetPermissionRequestSchema
    )(params)
    query.id = userIds
    if (currentUserId) {
      query.current_user_id = currentUserId
    }

    const res = await this.signAndSendRequest({
      method: 'GET',
      path: '/comms/chats/permissions',
      headers: {},
      query
    })
    return (await res.json()) as TypedCommsResponse<ValidatedChatPermissions[]>
  }

  /**
   * Gets the user ids that have blocked the current user
   * @param params.currentUserId the user to act on behalf of
   * @returns the blockers response
   */
  public async getBlockers(params?: ChatGetBlockersRequest) {
    const parsedArgs = await parseParams(
      'getBlockers',
      ChatGetBlockersRequestSchema
    )(params)
    const query: HTTPQuery = {
      timestamp: new Date().getTime()
    }
    if (parsedArgs?.currentUserId) {
      query.current_user_id = parsedArgs.currentUserId
    }
    const response = await this.signAndSendRequest({
      method: 'GET',
      path: `/comms/chats/blockers`,
      headers: {},
      query
    })
    return (await response.json()) as TypedCommsResponse<string[]>
  }

  /**
   * Gets the user ids the current user has blocked
   * @param params.currentUserId the user to act on behalf of
   * @returns
   */
  public async getBlockees(params?: ChatGetBlockersRequest) {
    const parsedArgs = await parseParams(
      'getBlockees',
      ChatGetBlockersRequestSchema
    )(params)
    const query: HTTPQuery = {
      timestamp: new Date().getTime()
    }
    if (parsedArgs?.currentUserId) {
      query.current_user_id = parsedArgs.currentUserId
    }
    const response = await this.signAndSendRequest({
      method: 'GET',
      path: `/comms/chats/blockees`,
      headers: {},
      query
    })
    return (await response.json()) as TypedCommsResponse<string[]>
  }

  /**
   * Gets URL metadata useful for link previews
   * @param params.content the urls to get metadata for
   * @returns the unfurl response
   */
  public async unfurl(params: ChatUnfurlRequest) {
    const { urls } = await parseParams(
      'unfurl',
      ChatUnfurlRequestSchema
    )(params)
    const query: HTTPQuery = {
      content: urls
    }
    const res = await this.request({
      method: 'GET',
      path: '/comms/unfurl',
      query,
      headers: {}
    })
    return (await res.json()) as UnfurlResponse[]
  }

  // #endregion

  // #region MUTATE

  /**
   * Creates a chat between users
   * @param params.userId the user id who is creating the chat
   * @param params.invitedUserIds the user ids to add to the chat
   * @param params.currentUserId the user to act on behalf of
   * @returns the rpc object
   */
  public async create(params: ChatCreateRequest): Promise<ChatCreateRPC> {
    const { currentUserId, userId, invitedUserIds } = await parseParams(
      'create',
      ChatCreateRequestSchema
    )(params)

    const chatId = [userId, ...invitedUserIds].sort().join(':')
    const chatSecret = secp.utils.randomPrivateKey()
    const invites = await this.createInvites(userId, invitedUserIds, chatSecret)

    return (await this.sendRpc({
      current_user_id: currentUserId,
      method: 'chat.create',
      params: {
        chat_id: chatId,
        invites
      }
    })) as ChatCreateRPC
  }

  /**
   * Invites other users to an existing chat
   * @param params.chatId the chat id of the chat to invite to
   * @param params.userId the user id who is creating the chat
   * @param params.invitedUserIds the user ids to add to the chat
   * @param params.currentUserId the user to act on behalf of
   * @returns the rpc object
   */
  public async invite(params: ChatInviteRequest) {
    const { currentUserId, chatId, userId, invitedUserIds } = await parseParams(
      'invite',
      ChatInviteRequestSchema
    )(params)

    const chatSecret = await this.getChatSecret(chatId)
    const invites = await this.createInvites(userId, invitedUserIds, chatSecret)
    return await this.sendRpc({
      current_user_id: currentUserId,
      method: 'chat.invite',
      params: {
        chat_id: chatId,
        invites
      }
    })
  }

  /**
   * Sends a message to a user in a chat
   * @param params.message the message
   * @param params.chatId the chat to send a message in
   * @param params.messageId the id of the message
   * @param params.currentUserId the user to act on behalf of
   * @returns the rpc object
   */
  public async message(params: ChatMessageRequest) {
    const { currentUserId, chatId, message, messageId } = await parseParams(
      'message',
      ChatMessageRequestSchema
    )(params)
    const chatSecret = await this.getChatSecret(chatId)
    const encrypted = await CryptoUtils.encryptString(chatSecret, message)
    const encodedMessage = base64.encode(encrypted)

    return await this.sendRpc({
      current_user_id: currentUserId,
      method: 'chat.message',
      params: {
        chat_id: chatId,
        message_id: messageId ?? ulid(),
        message: encodedMessage
      }
    })
  }

  /**
   * Sends a blast message to a set of users
   * @param params.message the message
   * @param params.blastId the id of the message
   * @param params.audience the audience to send the message to
   * @param params.audienceTrackId for targeting remixers/purchasers of a specific track
   * @param params.currentUserId the user to act on behalf of
   * @returns the rpc object
   */
  public async messageBlast(params: ChatBlastMessageRequest) {
    const {
      currentUserId,
      blastId,
      message,
      audience,
      audienceContentId,
      audienceContentType: audienceContentTypeParam
    } = await parseParams('messageBlast', ChatBlastMessageRequestSchema)(params)

    let audienceContentType = audienceContentTypeParam
    if (audience === ChatBlastAudience.REMIXERS && !!audienceContentId) {
      audienceContentType = 'track'
    }

    return await this.sendRpc({
      current_user_id: currentUserId,
      method: 'chat.blast',
      params: {
        blast_id: blastId ?? ulid(),
        audience,
        audience_content_id: audienceContentId,
        audience_content_type: audienceContentType,
        message
      }
    })
  }

  /**
   * Reacts to a message
   * @param params.reaction the reaction
   * @param params.chatId the chat to send a reaction in
   * @param params.messageId the id of the message to react to
   * @param params.currentUserId the user to act on behalf of
   * @returns the rpc object
   */
  public async react(params: ChatReactRequest) {
    const { currentUserId, chatId, messageId, reaction } = await parseParams(
      'react',
      ChatReactRequestSchema
    )(params)
    return await this.sendRpc({
      current_user_id: currentUserId,
      method: 'chat.react',
      params: {
        chat_id: chatId,
        message_id: messageId,
        reaction
      }
    })
  }

  /**
   * Marks a chat as read
   * @param params.chatId the chat to mark as read
   * @param params.currentUserId the user to act on behalf of
   * @returns the rpc object
   */
  public async read(params: ChatReadRequest) {
    const { currentUserId, chatId } = await parseParams(
      'read',
      ChatReadRequestSchema
    )(params)
    return await this.sendRpc({
      current_user_id: currentUserId,
      method: 'chat.read',
      params: {
        chat_id: chatId
      }
    })
  }

  /**
   * Blocks a user from sending messages to the current user
   * @param params.userId the user to block
   * @param params.currentUserId the user to act on behalf of
   * @returns the rpc object
   */
  public async block(params: ChatBlockRequest) {
    const { currentUserId, userId } = await parseParams(
      'block',
      ChatBlockRequestSchema
    )(params)
    return await this.sendRpc({
      current_user_id: currentUserId,
      method: 'chat.block',
      params: {
        user_id: userId
      }
    })
  }

  /**
   * Unblocks a user from sending messages to the current user
   * @param params.userId the user to unblock
   * @param params.currentUserId the user to act on behalf of
   * @returns the rpc object
   */
  public async unblock(params: ChatBlockRequest) {
    const { currentUserId, userId } = await parseParams(
      'unblock',
      ChatBlockRequestSchema
    )(params)
    return await this.sendRpc({
      current_user_id: currentUserId,
      method: 'chat.unblock',
      params: {
        user_id: userId
      }
    })
  }

  /**
   * Clears a chat's history for the current user
   * @param params.chatId the chat to clear
   * @param params.currentUserId the user to act on behalf of
   * @returns the rpc object
   */
  public async delete(params: ChatDeleteRequest) {
    const { currentUserId, chatId } = await parseParams(
      'delete',
      ChatDeleteRequestSchema
    )(params)
    return await this.sendRpc({
      current_user_id: currentUserId,
      method: 'chat.delete',
      params: {
        chat_id: chatId
      }
    })
  }

  /**
   * Sets the inbox settings permissions of the current user
   * @param params.permit the permission to set
   * @param params.currentUserId the user to act on behalf of
   * @returns the rpc object
   */
  public async permit(params: ChatPermitRequest) {
    const { currentUserId, permit, permitList, allow } = await parseParams(
      'permit',
      ChatPermitRequestSchema
    )(params)
    return await this.sendRpc({
      current_user_id: currentUserId,
      method: 'chat.permit',
      params: {
        permit: permit ?? ChatPermission.ALL,
        permit_list: permitList ?? [ChatPermission.ALL],
        allow
      }
    })
  }

  // #endregion

  // #region PRIVATE

  private async createInvites(
    userId: string,
    invitedUserIds: string[],
    chatSecret: Uint8Array
  ): Promise<ChatInvite[]> {
    const allUserIds = [userId, ...invitedUserIds]

    // Fetch all public keys in parallel to avoid sequential network requests
    const publicKeyPromises = allUserIds.map((id) => this.getPublicKey(id))
    const publicKeys = await Promise.all(publicKeyPromises)

    const userPublicKey = publicKeys[0]
    if (!userPublicKey) {
      throw new Error(`Failed to fetch public key for user ${userId}`)
    }

    return await Promise.all(
      allUserIds.map(async (userId, index) => {
        const inviteePublicKey = publicKeys[index]
        if (!inviteePublicKey) {
          throw new Error(`Failed to fetch public key for user ${userId}`)
        }
        const inviteCode = await this.createInviteCode(
          userPublicKey,
          inviteePublicKey,
          chatSecret
        )
        return {
          user_id: userId,
          invite_code: base64.encode(inviteCode)
        }
      })
    )
  }

  private async createInviteCode(
    userPublicKey: Uint8Array,
    inviteePublicKey: Uint8Array,
    chatSecret: Uint8Array
  ) {
    const sharedSecret = await this.audiusWalletClient.getSharedSecret({
      publicKey: inviteePublicKey
    })
    const encryptedChatSecret = await CryptoUtils.encrypt(
      sharedSecret,
      chatSecret
    )
    const inviteCode = new Uint8Array(65 + encryptedChatSecret.length)
    inviteCode.set(userPublicKey)
    inviteCode.set(encryptedChatSecret, 65)
    return inviteCode
  }

  private async readInviteCode(inviteCode: Uint8Array) {
    const friendPublicKey = inviteCode.slice(0, 65)
    const chatSecretEncrypted = inviteCode.slice(65)
    const sharedSecret = await this.audiusWalletClient.getSharedSecret({
      publicKey: friendPublicKey
    })
    return await CryptoUtils.decrypt(sharedSecret, chatSecretEncrypted)
  }

  private async decryptLastChatMessage(c: UserChat): Promise<UserChat> {
    if (c.last_message_is_plaintext) return c
    let lastMessage = ''
    try {
      const sharedSecret = await this.getChatSecret(c.chat_id)
      if (c.last_message && c.last_message.length > 0) {
        lastMessage = await CryptoUtils.decryptString(
          sharedSecret,
          base64.decode(c.last_message)
        )
      }
    } catch (e) {
      this.logger.error(
        "[audius-sdk]: Error: Couldn't decrypt last chat message",
        c,
        e
      )
      lastMessage = GENERIC_MESSAGE_ERROR
    }
    return {
      ...c,
      last_message: lastMessage
    }
  }

  private async getRaw(chatId: string, currentUserId?: string) {
    const path = `/comms/chats/${chatId}`
    const queryParameters: HTTPQuery = {
      timestamp: new Date().getTime()
    }
    if (currentUserId) {
      queryParameters.current_user_id = currentUserId
    }
    const response = await this.signAndSendRequest({
      method: 'GET',
      headers: {},
      path,
      query: queryParameters
    })
    return (await response.json()) as TypedCommsResponse<UserChat>
  }

  private async getChatSecret(chatId: string) {
    const existingChatSecret = this.chatSecrets[chatId]
    if (!existingChatSecret) {
      const response = await this.getRaw(chatId)
      const chatSecret = await this.readInviteCode(
        base64.decode(response.data.invite_code)
      )
      this.chatSecrets[chatId] = chatSecret
      return chatSecret
    }
    return existingChatSecret
  }

  private async getPublicKey(userId: string): Promise<Uint8Array> {
    if (!this.publicKeyCache[userId]) {
      this.publicKeyCache[userId] = this.fetchPublicKey(userId)
    }
    const cachedPromise = this.publicKeyCache[userId]
    if (!cachedPromise) {
      throw new Error(
        `Public key cache is unexpectedly empty for user ${userId}`
      )
    }
    return await cachedPromise
  }

  private async fetchPublicKey(userId: string): Promise<Uint8Array> {
    const response = await this.request({
      path: `/comms/pubkey/${userId}`,
      method: 'GET',
      headers: {}
    })
    const json = await response.json()
    return base64.decode(json.data)
  }

  private async upgradeBlasts(userId: string) {
    const blasts = await this.getBlasts()
    const uniqueBlasts = uniqBy(blasts.data, 'pending_chat_id')

    await Promise.all(
      uniqueBlasts.map(async (blast) => {
        const encodedSenderId = encodeHashId(blast.from_user_id)
        if (encodedSenderId) {
          await this.create({
            userId,
            invitedUserIds: [encodedSenderId]
          })
        }
      })
    )

    for (const blast of blasts.data) {
      const encodedSenderId = encodeHashId(blast.from_user_id)
      if (encodedSenderId) {
        this.eventEmitter.emit('message', {
          chatId: blast.pending_chat_id,
          message: {
            // the order of blast_id + pending_chat_id needs to match Misc.BlastMessageID in comms
            message_id: blast.blast_id + blast.pending_chat_id,
            message: blast.plaintext,
            sender_user_id: encodedSenderId,
            created_at: blast.created_at,
            reactions: [],
            is_plaintext: true,
            audience: blast.audience
          }
        })
      }
    }
  }

  private async getSignatureHeader(payload: string) {
    const [signature, recid] = await this.audiusWalletClient.sign({
      message: payload
    })
    const signatureBytes = new Uint8Array(65)
    signatureBytes.set(signature, 0)
    signatureBytes[64] = recid
    return { 'x-sig': base64.encode(signatureBytes) }
  }

  private async signAndSendRequest(request: RequestOpts) {
    const payload =
      request.method === 'GET'
        ? request.query
          ? `${request.path}?${this.configuration.queryParamsStringify(
              request.query
            )}`
          : request.path
        : request.body
    return await this.request({
      ...request,
      headers: {
        ...request.headers,
        ...(await this.getSignatureHeader(payload))
      }
    })
  }

  private async sendRpc(
    args: RPCPayloadRequest & { current_user_id?: string }
  ) {
    const payload = JSON.stringify({ ...args, timestamp: new Date().getTime() })
    await this.signAndSendRequest({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      path: `/comms/mutate`,
      body: payload
    })
    return args
  }

  private async createWebsocket(endpoint: string) {
    const timestamp = new Date().getTime()
    const originalUrl = `/comms/chats/ws?timestamp=${timestamp}`
    const signatureHeader = await this.getSignatureHeader(originalUrl)
    const host = endpoint.replace(/http(s?)/g, 'ws$1')
    const url = `${host}${originalUrl}&signature=${encodeURIComponent(
      signatureHeader['x-sig']
    )}`
    const ws = new WebSocket(url)
    ws.addEventListener('message', (messageEvent) => {
      const handleAsync = async () => {
        const data = JSON.parse(messageEvent.data) as ChatWebsocketEventData
        if (data.rpc.method === 'chat.message') {
          const sharedSecret = await this.getChatSecret(data.rpc.params.chat_id)
          this.eventEmitter.emit('message', {
            chatId: data.rpc.params.chat_id,
            message: {
              message_id: data.rpc.params.message_id,
              message: data.rpc.params.is_plaintext
                ? data.rpc.params.message
                : await CryptoUtils.decryptString(
                    sharedSecret,
                    base64.decode(data.rpc.params.message)
                  ).catch((e) => {
                    this.logger.error(
                      "[audius-sdk]: Error: Couldn't decrypt websocket chat message",
                      data,
                      e
                    )
                    return GENERIC_MESSAGE_ERROR
                  }),
              sender_user_id: data.metadata.senderUserId,
              created_at: data.metadata.timestamp,
              reactions: [],
              is_plaintext: !!data.rpc.params.is_plaintext,
              audience: data.rpc.params.audience
            }
          })
        } else if (data.rpc.method === 'chat.react') {
          this.eventEmitter.emit('reaction', {
            chatId: data.rpc.params.chat_id,
            messageId: data.rpc.params.message_id,
            reaction: {
              reaction: data.rpc.params.reaction,
              user_id: data.metadata.senderUserId,
              created_at: data.metadata.timestamp
            }
          })
        } else if (data.rpc.method === 'chat.blast') {
          const userId = data.metadata.receiverUserId
          await this.upgradeBlasts(userId)
          this.eventEmitter.emit('blast', {
            audience: data.rpc.params.audience,
            audienceContentType: data.rpc.params.audience_content_type,
            audienceContentId: data.rpc.params.audience_content_id,
            message: {
              message_id: data.rpc.params.blast_id,
              message: data.rpc.params.message,
              sender_user_id: data.metadata.senderUserId,
              created_at: data.metadata.timestamp,
              reactions: [],
              is_plaintext: true,
              audience: data.rpc.params.audience
            }
          })
        }
      }
      handleAsync()
    })
    ws.addEventListener('open', () => {
      this.eventEmitter.emit('open')
    })
    ws.addEventListener('close', () => {
      this.eventEmitter.emit('close')
    })
    ws.addEventListener('error', (e) => {
      this.eventEmitter.emit('error', e)
    })
    return ws
  }

  // #endregion
}
