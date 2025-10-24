import { useCallback, useRef, useState } from 'react'

import { useProxySelector } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'
import { chatActions, chatSelectors } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import { OptionalHashId } from '@audius/sdk'
import type { TextInput as RNTextInput } from 'react-native'
import { Platform } from 'react-native'
import { useDispatch } from 'react-redux'

import { Flex } from '@audius/harmony-native'
import { ComposerInput } from 'app/components/composer-input'
import { spacing } from 'app/styles/spacing'

import { ComposerCollectionInfo, ComposerTrackInfo } from './ComposePreviewInfo'

const { sendMessage } = chatActions
const { getChat } = chatSelectors

const messages = {
  startNewMessage: ' Start typing...'
}

type ChatTextInputProps = {
  chatId: string
  extraOffset?: number // Additional padding needed if screen header size changes
  presetMessage?: string
  onMessageSent: () => void
}

export const ChatTextInput = ({
  chatId,
  extraOffset = 0,
  presetMessage,
  onMessageSent
}: ChatTextInputProps) => {
  const dispatch = useDispatch()
  const chat = useProxySelector((state) => getChat(state, chatId), [chatId])
  const [messageId, setMessageId] = useState(0)
  // The track and collection ids used to render the composer preview
  const [trackId, setTrackId] = useState<Nullable<ID>>(null)
  const [collectionId, setCollectionId] = useState<Nullable<ID>>(null)
  const ref = useRef<RNTextInput>(null)

  const handleChange = useCallback(
    // (value: string, linkEntities: LinkEntity[]) => {
    (value: string, linkEntities: any[]) => {
      const track = linkEntities.find((e) => e.type === 'track')
      setTrackId(
        track ? (OptionalHashId.parse(track.data.id as string) ?? null) : null
      )

      const collection = linkEntities.find((e) => e.type === 'collection')
      setCollectionId(
        collection
          ? (OptionalHashId.parse(collection.data.id as string) ?? null)
          : null
      )
    },
    []
  )

  const handleSubmit = useCallback(
    async (value: string) => {
      if (chatId && value) {
        dispatch(
          sendMessage({ chatId, message: value, audience: chat?.audience })
        )
        onMessageSent()
        setMessageId((id) => ++id)
        setTimeout(() => ref.current?.blur())
      }
    },
    [chatId, dispatch, onMessageSent, chat?.audience]
  )

  // For iOS: default padding + extra padding
  // For Android: extra padding is slightly larger than iOS, and only
  // needed if the screen header size changes
  const offset =
    Platform.OS === 'ios'
      ? spacing(1.5) + extraOffset
      : Platform.OS === 'android'
        ? extraOffset
          ? spacing(1.5) + extraOffset
          : undefined
        : undefined

  return (
    <Flex>
      {trackId ? (
        <ComposerTrackInfo trackId={trackId} />
      ) : collectionId ? (
        <ComposerCollectionInfo collectionId={collectionId} />
      ) : null}

      <Flex
        style={{
          position: 'relative',
          paddingBottom: offset
        }}
      >
        <ComposerInput
          ref={ref}
          messageId={messageId}
          presetMessage={presetMessage}
          placeholder={messages.startNewMessage}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      </Flex>
    </Flex>
  )
}
