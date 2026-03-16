import { type AudiusSdkWithServices, type ChatEvents, Id } from '@audius/sdk/services'
import { QueryClient } from '@tanstack/react-query'
import { Middleware } from 'redux'

import { getCurrentAccountQueryKey } from '~/api'
import { Status } from '~/models/Status'
import { makeBlastChatId } from '~/utils'

import { actions as chatActions } from './slice'
import { ChatWebsocketError } from './types'

const { connect, disconnect, addMessage, setMessageReactionSucceeded } =
  chatActions

export const chatMiddleware =
  (
    audiusSdk: () => Promise<AudiusSdkWithServices>,
    queryClient: QueryClient
  ): Middleware =>
  (store) => {
    let messageListener: ChatEvents['message'] | null = null
    let reactionListener: ChatEvents['reaction'] | null = null
    let blastListener: ChatEvents['blast'] | null = null
    let openListener: ChatEvents['open'] | null = null
    let closeListener: ChatEvents['close'] | null = null
    let errorListener: ChatEvents['error'] | null = null

    let hasConnected = false
    return (next) => (action) => {
      if (connect.match(action) && !hasConnected) {
        hasConnected = true
        const fn = async () => {
          const sdk = await audiusSdk()
          openListener = () => {
            console.debug('[chats] WebSocket opened. Listening for chats...')
          }
          messageListener = ({ chatId, message }) => {
            const currentUser = queryClient.getQueryData(
              getCurrentAccountQueryKey()
            )
            const isSelfMessage =
              message.sender_user_id === Id.parse(currentUser?.userId)

            store.dispatch(
              addMessage({
                chatId,
                message,
                status: Status.SUCCESS,
                isSelfMessage
              })
            )
          }
          blastListener = ({
            audience,
            audienceContentType,
            audienceContentId,
            message
          }) => {
            const currentUser = queryClient.getQueryData(
              getCurrentAccountQueryKey()
            )
            const isSelfMessage =
              message.sender_user_id === Id.parse(currentUser?.userId)
            // Only add blasts that current user sent as blast UI should only be visible to sender.
            if (isSelfMessage) {
              store.dispatch(
                addMessage({
                  chatId: makeBlastChatId({
                    audience,
                    audienceContentType,
                    audienceContentId
                  }),
                  message,
                  status: Status.SUCCESS,
                  isSelfMessage
                })
              )
            }
          }
          reactionListener = ({ chatId, messageId, reaction }) => {
            store.dispatch(
              setMessageReactionSucceeded({
                chatId,
                messageId,
                reaction
              })
            )
          }
          closeListener = async () => {
            console.debug('[chats] WebSocket closed. Reconnecting...')
            await sdk.chats.listen()
          }
          errorListener = (e) => {
            console.debug('[chats] WebSocket error.', e)
            // Most errors received here have no `code` and are not actionable, so only
            // log the outliers.
            if (e.code) {
              store.dispatch(
                chatActions.logError({
                  error: new ChatWebsocketError(e.code, e.target.url)
                })
              )
            }
          }
          sdk.chats.addEventListener('open', openListener)
          sdk.chats.addEventListener('message', messageListener)
          sdk.chats.addEventListener('blast', blastListener)
          sdk.chats.addEventListener('reaction', reactionListener)
          sdk.chats.addEventListener('close', closeListener)
          sdk.chats.addEventListener('error', errorListener)
          console.debug('[chats] Listening...')
          return sdk.chats.listen()
        }
        fn()
      } else if (disconnect.match(action) && hasConnected) {
        console.debug('[chats] Unlistening...')
        hasConnected = false
        const fn = async () => {
          const sdk = await audiusSdk()
          if (openListener) {
            sdk.chats.removeEventListener('open', openListener)
          }
          if (messageListener) {
            sdk.chats.removeEventListener('message', messageListener)
          }
          if (reactionListener) {
            sdk.chats.removeEventListener('reaction', reactionListener)
          }
          if (closeListener) {
            sdk.chats.removeEventListener('close', closeListener)
          }
          if (errorListener) {
            sdk.chats.removeEventListener('error', errorListener)
          }
        }
        fn()
      }
      return next(action)
    }
  }
