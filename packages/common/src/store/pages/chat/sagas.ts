import {
  ChatBlast,
  HashId,
  Id,
  OptionalHashId,
  OptionalId,
  type ChatMessage,
  type TypedCommsResponse,
  type UserChat,
  type ValidatedChatPermissions
} from '@audius/sdk'
import {
  call,
  delay,
  put,
  select,
  takeEvery,
  takeLatest
} from 'typed-redux-saga'
import { ulid } from 'ulid'

import {
  getChatMemberUserIds,
  queryCurrentUserId,
  queryHasAccount,
  queryUsers
} from '~/api'
import { Name } from '~/models/Analytics'
import { Feature } from '~/models/ErrorReporting'
import { ID } from '~/models/Identifiers'
import { Status } from '~/models/Status'
import * as toastActions from '~/store/ui/toast/slice'
import dayjs from '~/utils/dayjs'

import {
  isResponseError,
  makeBlastChatId,
  removeNullable
} from '../../../utils'
import { getContext } from '../../effects'

import * as chatSelectors from './selectors'
import { actions as chatActions } from './slice'
import { makeChatId } from './utils'

// Attach ulid to window object for debugging DMs
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.ulid = ulid
}

const {
  createChat,
  createChatBlast,
  createChatSucceeded,
  fetchUnreadMessagesCount,
  fetchUnreadMessagesCountSucceeded,
  fetchUnreadMessagesCountFailed,
  goToChat,
  fetchChatIfNecessary,
  fetchLatestChats,
  fetchMoreChats,
  fetchMoreChatsSucceeded,
  fetchMoreChatsFailed,
  fetchLatestMessages,
  fetchMoreMessages,
  fetchMoreMessagesSucceeded,
  fetchMoreMessagesFailed,
  fetchChatSucceeded,
  setMessageReaction,
  setMessageReactionSucceeded,
  setMessageReactionFailed,
  logError,
  markChatAsRead,
  markChatAsReadSucceeded,
  markChatAsReadFailed,
  sendMessage,
  sendMessageFailed,
  addMessage,
  fetchBlockees,
  fetchBlockeesSucceeded,
  fetchBlockers,
  fetchBlockersSucceeded,
  unblockUser,
  blockUser,
  fetchPermissions,
  fetchPermissionsSucceeded,
  fetchLinkUnfurl,
  fetchLinkUnfurlSucceeded,
  deleteChat,
  deleteChatSucceeded
} = chatActions
const { getChatsSummary, getChat, getUnfurlMetadata, getNonOptimisticChat } =
  chatSelectors
const { toast } = toastActions

const CHAT_PAGE_SIZE = 30
const MESSAGES_PAGE_SIZE = 50

/**
 * Helper to dispatch actions for fetching chat users
 */
function* fetchUsersForChats(chats: UserChat[]) {
  const userIds = chats.reduce((acc, chat) => {
    chat.chat_members.forEach((member) => {
      acc.add(HashId.parse(member.user_id))
    })
    return acc
  }, new Set<number>())

  yield* call(queryUsers, Array.from(userIds.values()))
}

function* doFetchUnreadMessagesCount() {
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    const response = yield* call([sdk.chats, sdk.chats.getUnreadCount])
    yield* put(
      fetchUnreadMessagesCountSucceeded({ unreadMessagesCount: response.data })
    )
  } catch (e) {
    yield* put(fetchUnreadMessagesCountFailed())
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      feature: Feature.Chats
    })
  }
}

/**
 * Gets all chats fresher than what we currently have
 */
function* doFetchLatestChats() {
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    const summary = yield* select(getChatsSummary)
    let before: string | undefined
    let hasMoreChats = true
    let data: UserChat[] = []
    let firstResponse: TypedCommsResponse<UserChat[]> | undefined
    const currentUserId = yield* call(queryCurrentUserId)
    if (!currentUserId) {
      throw new Error('User not found')
    }
    while (hasMoreChats) {
      const response = yield* call([sdk.chats, sdk.chats.getAll], {
        userId: Id.parse(currentUserId),
        before,
        after: summary?.next_cursor,
        limit: CHAT_PAGE_SIZE
      })
      hasMoreChats = response.data.length > 0
      before = summary?.prev_cursor
      data = data.concat(response.data)
      if (!firstResponse) {
        firstResponse = response
      }
    }
    yield* fetchUsersForChats(data)
    yield* put(
      fetchMoreChatsSucceeded({
        ...firstResponse,
        data
      })
    )
  } catch (e) {
    yield* put(fetchMoreChatsFailed())
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      feature: Feature.Chats
    })
  }
}

function* doFetchMoreChats() {
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    const summary = yield* select(getChatsSummary)
    const before = summary?.prev_cursor
    const currentUserId = yield* call(queryCurrentUserId)
    if (!currentUserId) {
      throw new Error('User not found')
    }
    const response = yield* call([sdk.chats, sdk.chats.getAll], {
      userId: Id.parse(currentUserId),
      before,
      limit: CHAT_PAGE_SIZE
    })
    yield* fetchUsersForChats(response.data)
    yield* put(fetchMoreChatsSucceeded(response))
  } catch (e) {
    yield* put(fetchMoreChatsFailed())
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      feature: Feature.Chats
    })
  }
}

/**
 * Gets all messages newer than what we currently have
 */
function* doFetchLatestMessages(
  action: ReturnType<typeof fetchLatestMessages>
) {
  const { chatId } = action.payload
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)

    // Update the chat too to keep everything in sync
    yield* call(doFetchChat, { chatId })
    const chat = yield* select((state) => getChat(state, chatId))
    const after = chat?.messagesSummary?.next_cursor

    // On first fetch of messages, we won't have an after cursor.
    // Do `fetchMoreMessages` instead for initial fetch of messages and get all up to the first unread
    if (!after) {
      yield* call(doFetchMoreMessages, action)
      return
    }

    let hasMoreUnread = true
    let data: ChatMessage[] = []
    let before: string | undefined
    let firstResponse: TypedCommsResponse<ChatMessage[]> | undefined
    while (hasMoreUnread) {
      // This will get all messages sent after what we currently got, starting at the most recent,
      // and batching by MESSAGE_PAGE_SIZE. Sends one extra request to get the 0 response but oh well
      const response = yield* call([sdk.chats, sdk.chats.getMessages], {
        chatId,
        isBlast: chat.is_blast,
        before,
        after,
        limit: MESSAGES_PAGE_SIZE
      })
      data = data.concat(response.data)
      // If we have no more messages with our after filter, we're done
      hasMoreUnread = response.data.length > 0
      before = response.summary?.prev_cursor
      if (!firstResponse) {
        firstResponse = response
      }
    }
    yield* put(
      fetchMoreMessagesSucceeded({
        chatId,
        response: {
          ...firstResponse,
          data
        }
      })
    )
  } catch (e) {
    yield* put(fetchMoreMessagesFailed({ chatId }))
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      additionalInfo: {
        chatId
      },
      feature: Feature.Chats
    })
  }
}

/**
 * Get older messages than what we currently have for a chat
 */
function* doFetchMoreMessages(action: ReturnType<typeof fetchMoreMessages>) {
  const { chatId } = action.payload
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)

    // Ensure we get a chat so we can check the unread count
    yield* call(doFetchChatIfNecessary, { chatId })
    const chat = yield* select((state) => getChat(state, chatId))

    // Paginate through messages until we get to the unread indicator
    let lastResponse: TypedCommsResponse<ChatMessage[]> | undefined
    let before = chat?.messagesSummary?.prev_cursor
    let hasMoreUnread = true
    let data: ChatMessage[] = []
    while (hasMoreUnread) {
      const response = yield* call([sdk.chats, sdk.chats.getMessages], {
        chatId,
        isBlast: chat?.is_blast,
        before,
        limit: MESSAGES_PAGE_SIZE
      })
      // Only save the last response summary. Pagination is one-way
      lastResponse = response
      data = data.concat(response.data)
      // If the unread count is greater than the previous fetched messages (next_cursor)
      // plus this batch, we should keep fetching
      hasMoreUnread =
        !!chat?.unread_message_count &&
        chat.unread_message_count >
          (response.summary?.next_count ?? 0) + data.length
      before = response.summary?.prev_cursor
    }
    if (!lastResponse) {
      throw new Error('No responses gathered')
    }
    yield* put(
      fetchMoreMessagesSucceeded({
        chatId,
        response: {
          ...lastResponse,
          data
        }
      })
    )
  } catch (e) {
    yield* put(fetchMoreMessagesFailed({ chatId }))
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      additionalInfo: {
        chatId
      },
      feature: Feature.Chats
    })
  }
}

function* doSetMessageReaction(action: ReturnType<typeof setMessageReaction>) {
  const { chatId, messageId, reaction, userId } = action.payload
  const { track, make } = yield* getContext('analytics')
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    const hasAccount = yield* call(queryHasAccount)
    if (!hasAccount) {
      throw new Error('User not found')
    }
    yield* call([sdk.chats, sdk.chats.react], {
      chatId,
      messageId,
      reaction
    })
    const reactionResponse = {
      user_id: Id.parse(userId),
      reaction,
      created_at: dayjs().toISOString()
    }
    yield* put(
      setMessageReactionSucceeded({
        chatId,
        messageId,
        reaction: reactionResponse
      })
    )
    yield* call(
      track,
      make({
        eventName: Name.SEND_MESSAGE_REACTION_SUCCESS,
        reaction
      })
    )
  } catch (e) {
    yield* put(setMessageReactionFailed(action.payload))
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      additionalInfo: {
        chatId,
        messageId,
        reaction,
        userId
      },
      feature: Feature.Chats
    })
    yield* call(
      track,
      make({
        eventName: Name.SEND_MESSAGE_REACTION_FAILURE,
        reaction
      })
    )
  }
}

function* doCreateChat(action: ReturnType<typeof createChat>) {
  const { userIds, skipNavigation, presetMessage, replaceNavigation } =
    action.payload
  const { track, make } = yield* getContext('analytics')
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    const currentUserId = yield* call(queryCurrentUserId)
    if (!currentUserId) {
      throw new Error('User not found')
    }
    // Try to get existing chat:
    const chatId = makeChatId([currentUserId, ...userIds])

    // Optimistically go to the chat. If we fail to create it, we'll toast
    if (!skipNavigation) {
      yield* put(goToChat({ chatId, presetMessage, replaceNavigation }))
    }

    try {
      yield* call(doFetchChatIfNecessary, { chatId })
    } catch {}
    const existingChat = yield* select((state) => getChat(state, chatId))
    if (!existingChat) {
      // Create new chat
      yield* call([sdk.chats, sdk.chats.create], {
        userId: Id.parse(currentUserId),
        invitedUserIds: userIds.map((id) => Id.parse(id))
      })

      const res = yield* call([sdk.chats, sdk.chats.get], { chatId })
      const chat = res.data
      if (!chat) {
        throw new Error("Chat couldn't be found after creating")
      }
      yield* put(createChatSucceeded({ chat }))
      yield* call(track, make({ eventName: Name.CREATE_CHAT_SUCCESS }))
    }
  } catch (e) {
    yield* put(
      toast({
        type: 'error',
        content: 'Something went wrong. Failed to create chat.'
      })
    )
    const reportToSentry = yield* getContext('reportToSentry')
    if (!isResponseError(e) || e.response?.status !== 403) {
      reportToSentry({
        name: 'Chats',
        error: e as Error,
        additionalInfo: {
          userIds
        },
        feature: Feature.Chats
      })
    }
    yield* call(track, make({ eventName: Name.CREATE_CHAT_FAILURE }))
  }
}

function* doCreateChatBlast(action: ReturnType<typeof createChatBlast>) {
  const {
    audience,
    audienceContentId,
    audienceContentType,
    presetMessage,
    replaceNavigation,
    skipNavigation
  } = action.payload

  const { track, make } = yield* getContext('analytics')
  const currentUserId = yield* call(queryCurrentUserId)
  try {
    if (!currentUserId) {
      throw new Error('User not found')
    }

    const encodedContentId = OptionalId.parse(audienceContentId)
    const chatId = makeBlastChatId({
      audience,
      audienceContentId: encodedContentId,
      audienceContentType
    })

    // Optimistically go to the chat. If we fail to create it, we'll toast
    if (!skipNavigation) {
      yield* put(goToChat({ chatId, presetMessage, replaceNavigation }))
    }

    const existingChat = yield* select((state) => getChat(state, chatId))
    if (!existingChat) {
      const newBlast: ChatBlast = {
        chat_id: chatId,
        audience_content_id: encodedContentId,
        audience_content_type: audienceContentType,
        is_blast: true,
        last_message_at: dayjs().toISOString(),
        audience
      }
      yield* put(
        createChatSucceeded({
          chat: newBlast
        })
      )
      yield* call(
        track,
        make({
          eventName: Name.CREATE_CHAT_BLAST_SUCCESS,
          audience,
          audienceContentType,
          audienceContentId,
          sentBy: currentUserId
        })
      )
    }
  } catch (e) {
    yield* put(
      toast({
        type: 'error',
        content: 'Something went wrong. Failed to create chat blast.'
      })
    )
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      additionalInfo: {
        audience,
        audienceContentId,
        audienceContentType
      },
      feature: Feature.Chats
    })

    yield* call(
      track,
      make({
        eventName: Name.CREATE_CHAT_BLAST_FAILURE,
        audience,
        audienceContentType,
        audienceContentId,
        sentBy: currentUserId ?? undefined
      })
    )
  }
}

function* doMarkChatAsRead(action: ReturnType<typeof markChatAsRead>) {
  const { chatId } = action.payload
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    // Use non-optimistic chat here so that the calculation of whether to mark
    // the chat as read or not are consistent with values in backend
    const chat = yield* select((state) => getNonOptimisticChat(state, chatId))
    if (chat?.is_blast) return

    yield* call([sdk.chats, sdk.chats.read], { chatId })
    yield* put(markChatAsReadSucceeded({ chatId }))
  } catch (e) {
    yield* put(markChatAsReadFailed({ chatId }))
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      additionalInfo: {
        chatId
      },
      feature: Feature.Chats
    })
  }
}

function* doSendMessage(action: ReturnType<typeof sendMessage>) {
  const { chatId, message, resendMessageId } = action.payload
  const { track, make } = yield* getContext('analytics')
  const messageIdToUse = resendMessageId ?? ulid()
  const userId = yield* call(queryCurrentUserId)
  const chat = yield* select((state) => getChat(state, chatId))
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    const currentUserId = OptionalId.parse(userId)
    if (!currentUserId) {
      return
    }

    // Optimistically add the message
    yield* put(
      addMessage({
        chatId,
        message: {
          sender_user_id: currentUserId,
          message_id: messageIdToUse,
          message,
          reactions: [],
          created_at: dayjs().toISOString(),
          is_plaintext: !!chat?.is_blast,
          audience: chat?.audience
        },
        status: Status.LOADING,
        isSelfMessage: true
      })
    )

    if (chat?.is_blast) {
      yield* call([sdk.chats, sdk.chats.messageBlast], {
        audience: chat.audience,
        audienceContentType: chat.audience_content_type,
        audienceContentId: chat.audience_content_id,
        blastId: messageIdToUse,
        message
      })
      yield* call(
        track,
        make({
          eventName: Name.CHAT_BLAST_MESSAGE_SENT,
          audience: chat.audience,
          audienceContentType: chat.audience_content_type,
          audienceContentId:
            OptionalHashId.parse(chat.audience_content_id) ?? undefined
        })
      )
    } else {
      yield* call([sdk.chats, sdk.chats.message], {
        chatId,
        messageId: messageIdToUse,
        message
      })
    }
    yield* call(track, make({ eventName: Name.SEND_MESSAGE_SUCCESS }))
  } catch (e) {
    yield* put(sendMessageFailed({ chatId, messageId: messageIdToUse }))

    // Fetch the chat to see if permissions need rechecking
    yield* call(doFetchChat, { chatId })
    // Refetch blocking status to see if user was just blocked or has just blocked that user
    yield* put(fetchBlockees())
    yield* put(fetchBlockers())
    if (userId) {
      const chat = yield* select((state) => getChat(state, chatId))
      if (chat) {
        const otherUserIds = getChatMemberUserIds(chat, userId)
        const otherUsersMap = yield* call(queryUsers, otherUserIds)
        const otherUsers = Object.values(otherUsersMap)
        if (otherUsers) {
          // Get permissions of ourselves and other users in the chat
          yield* put(
            fetchPermissions({
              userIds: [userId, ...otherUsers.map((u) => u.user_id)]
            })
          )
        }
      }
    }
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      additionalInfo: {
        chatId,
        messageId: messageIdToUse
      },
      feature: Feature.Chats
    })
    yield* call(track, make({ eventName: Name.SEND_MESSAGE_FAILURE }))
  }
}

function* doFetchChat({ chatId }: { chatId: string }) {
  const audiusSdk = yield* getContext('audiusSdk')
  const sdk = yield* call(audiusSdk)
  const { data: chat } = yield* call([sdk.chats, sdk.chats.get], { chatId })
  if (chat) {
    yield* fetchUsersForChats([chat])
    yield* put(fetchChatSucceeded({ chat }))
  }
}

function* doFetchChatIfNecessary(args: { chatId: string }) {
  const { chatId } = args
  const existingChat = yield* select((state) => getChat(state, chatId))
  if (!existingChat) {
    yield* call(doFetchChat, { chatId })
  }
}

function* doFetchBlockees() {
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    const { data } = yield* call([sdk.chats, sdk.chats.getBlockees])
    yield* put(
      fetchBlockeesSucceeded({
        blockees: data
          .map((encodedId) => OptionalHashId.parse(encodedId))
          .filter(removeNullable)
      })
    )
  } catch (e) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      feature: Feature.Chats
    })
  }
}

function* doFetchBlockers() {
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    const { data } = yield* call([sdk.chats, sdk.chats.getBlockers])
    yield* put(
      fetchBlockersSucceeded({
        blockers: data
          .map((encodedId) => OptionalHashId.parse(encodedId))
          .filter(removeNullable)
      })
    )
  } catch (e) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      feature: Feature.Chats
    })
  }
}

function* doBlockUser(action: ReturnType<typeof blockUser>) {
  const { userId } = action.payload
  const { track, make } = yield* getContext('analytics')
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    yield* call([sdk.chats, sdk.chats.block], {
      userId: Id.parse(userId)
    })
    yield* put(fetchBlockees())
    yield* call(
      track,
      make({ eventName: Name.BLOCK_USER_SUCCESS, blockedUserId: userId })
    )
  } catch (e) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      feature: Feature.Chats
    })
    yield* call(
      track,
      make({ eventName: Name.BLOCK_USER_FAILURE, blockedUserId: userId })
    )
  }
}

function* doUnblockUser(action: ReturnType<typeof unblockUser>) {
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    yield* call([sdk.chats, sdk.chats.unblock], {
      userId: Id.parse(action.payload.userId)
    })
    yield* put(fetchBlockees())
  } catch (e) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      feature: Feature.Chats
    })
  }
}

function* doFetchPermissions(action: ReturnType<typeof fetchPermissions>) {
  try {
    const currentUserId = yield* call(queryCurrentUserId)
    if (!currentUserId) {
      return
    }
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    const { data } = yield* call([sdk.chats, sdk.chats.getPermissions], {
      userIds: action.payload.userIds.map((id) => Id.parse(id))
    })
    yield* put(
      fetchPermissionsSucceeded({
        permissions: data.reduce(
          (acc, p) => ({
            ...acc,
            [HashId.parse(p.user_id)]: p
          }),
          {} as Record<ID, ValidatedChatPermissions>
        )
      })
    )
  } catch (e) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      feature: Feature.Chats
    })
  }
}

function* doFetchLinkUnfurlMetadata(
  action: ReturnType<typeof fetchLinkUnfurl>
) {
  const { messageId, chatId, href } = action.payload
  try {
    const unfurlMetadata = yield* select((state) =>
      getUnfurlMetadata(state, chatId, messageId)
    )
    if (unfurlMetadata) {
      return
    }
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    const data = yield* call([sdk.chats, sdk.chats.unfurl], {
      urls: [href]
    })
    yield* put(
      fetchLinkUnfurlSucceeded({ chatId, messageId, unfurlMetadata: data[0] })
    )
  } catch (e) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      additionalInfo: {
        chatId,
        messageId,
        href
      },
      feature: Feature.Chats
    })
  }
}

function* doDeleteChat(action: ReturnType<typeof deleteChat>) {
  const { chatId } = action.payload
  const { track, make } = yield* getContext('analytics')
  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    yield* call([sdk.chats, sdk.chats.delete], {
      chatId
    })
    // Go to chat root page
    yield* put(goToChat({}))
    // Wait for render
    yield* delay(1)
    // NOW delete the chat - otherwise we refetch it right away
    yield* put(deleteChatSucceeded({ chatId }))
    yield* call(track, make({ eventName: Name.DELETE_CHAT_SUCCESS }))
  } catch (e) {
    const reportToSentry = yield* getContext('reportToSentry')
    reportToSentry({
      name: 'Chats',
      error: e as Error,
      additionalInfo: {
        chatId
      },
      feature: Feature.Chats
    })
    yield* call(track, make({ eventName: Name.DELETE_CHAT_FAILURE }))
  }
}

function* doLogError({ payload: { error } }: ReturnType<typeof logError>) {
  const { track, make } = yield* getContext('analytics')
  const reportToSentry = yield* getContext('reportToSentry')
  const { code, url } = error
  reportToSentry({
    name: 'Chats',
    error,
    additionalInfo: {
      code,
      url
    },
    feature: Feature.Chats
  })
  yield* call(track, make({ eventName: Name.CHAT_WEBSOCKET_ERROR, code }))
}

function* watchFetchUnreadMessagesCount() {
  yield takeLatest(fetchUnreadMessagesCount, () => doFetchUnreadMessagesCount())
}

function* watchAddMessage() {
  yield takeEvery(addMessage, ({ payload }) => doFetchChatIfNecessary(payload))
}

function* watchSetMessageReactionSucceeded() {
  yield takeEvery(setMessageReactionSucceeded, ({ payload }) =>
    doFetchChatIfNecessary(payload)
  )
}

function* watchFetchChatIfNecessary() {
  yield takeEvery(fetchChatIfNecessary, ({ payload }) =>
    doFetchChatIfNecessary(payload)
  )
}

function* watchSendMessage() {
  yield takeEvery(sendMessage, doSendMessage)
}

function* watchFetchLatestChats() {
  yield takeLatest(fetchLatestChats, doFetchLatestChats)
}

function* watchFetchMoreChats() {
  yield takeLatest(fetchMoreChats, doFetchMoreChats)
}

function* watchFetchLatestMessages() {
  yield takeEvery(fetchLatestMessages, doFetchLatestMessages)
}

function* watchFetchMoreMessages() {
  yield takeEvery(fetchMoreMessages, doFetchMoreMessages)
}

function* watchSetMessageReaction() {
  yield takeEvery(setMessageReaction, doSetMessageReaction)
}

function* watchCreateChat() {
  yield takeEvery(createChat, doCreateChat)
}

function* watchCreateChatBlast() {
  yield takeEvery(createChatBlast, doCreateChatBlast)
}

function* watchMarkChatAsRead() {
  yield takeEvery(markChatAsRead, doMarkChatAsRead)
}

function* watchFetchBlockees() {
  yield takeLatest(fetchBlockees, doFetchBlockees)
}

function* watchFetchBlockers() {
  yield takeLatest(fetchBlockers, doFetchBlockers)
}

function* watchBlockUser() {
  yield takeEvery(blockUser, doBlockUser)
}

function* watchUnblockUser() {
  yield takeEvery(unblockUser, doUnblockUser)
}

function* watchFetchPermissions() {
  yield takeEvery(fetchPermissions, doFetchPermissions)
}

function* watchFetchLinkUnfurlMetadata() {
  yield takeEvery(fetchLinkUnfurl, doFetchLinkUnfurlMetadata)
}

function* watchDeleteChat() {
  yield takeEvery(deleteChat, doDeleteChat)
}

function* watchLogError() {
  yield takeEvery(logError, doLogError)
}

export const sagas = () => {
  return [
    watchFetchUnreadMessagesCount,
    watchFetchChatIfNecessary,
    watchFetchLatestChats,
    watchFetchMoreChats,
    watchFetchLatestMessages,
    watchFetchMoreMessages,
    watchSetMessageReaction,
    watchCreateChat,
    watchCreateChatBlast,
    watchMarkChatAsRead,
    watchSendMessage,
    watchAddMessage,
    watchSetMessageReactionSucceeded,
    watchFetchBlockees,
    watchFetchBlockers,
    watchBlockUser,
    watchUnblockUser,
    watchFetchPermissions,
    watchFetchLinkUnfurlMetadata,
    watchDeleteChat,
    watchLogError
  ]
}
