import { ComponentPropsWithoutRef, useCallback, useState } from 'react'

import { LinkEntity } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { chatActions, chatSelectors } from '@audius/common/store'
import { Nullable } from '@audius/common/utils'
import { Box } from '@audius/harmony'
import { HashId } from '@audius/sdk'
import { useDispatch } from 'react-redux'

import { useSelector } from 'common/hooks/useSelector'
import { ComposerInput } from 'components/composer-input/ComposerInput'

import { ComposerCollectionInfo, ComposerTrackInfo } from './ComposePreviewInfo'

const { sendMessage } = chatActions
const { getChat } = chatSelectors

const messages = {
  sendMessagePlaceholder: 'Start typing...'
}

type ChatComposerProps = ComponentPropsWithoutRef<'div'> & {
  chatId?: string
  presetMessage?: string
  onMessageSent: () => void
}

const MAX_MESSAGE_LENGTH = 10000

export const ChatComposer = (props: ChatComposerProps) => {
  const { chatId, presetMessage, onMessageSent } = props
  const dispatch = useDispatch()
  const chat = useSelector((state) => getChat(state, chatId ?? ''))
  const [value, setValue] = useState(presetMessage ?? '')
  const [messageId, setMessageId] = useState(0)
  // The track and collection ids used to render the composer preview
  const [trackId, setTrackId] = useState<Nullable<ID>>(null)
  const [collectionId, setCollectionId] = useState<Nullable<ID>>(null)

  const handleChange = useCallback(
    (value: string, linkEntities: LinkEntity[]) => {
      setValue(value)

      const track = linkEntities.find((e) => e.type === 'track')
      setTrackId(track ? HashId.parse(track.data.id) : null)

      const collection = linkEntities.find((e) => e.type === 'collection')
      setCollectionId(collection ? HashId.parse(collection.data.id) : null)
    },
    []
  )

  const handleSubmit = useCallback(async () => {
    if (chatId && value) {
      dispatch(
        sendMessage({ chatId, message: value, audience: chat?.audience })
      )
      setMessageId((id) => ++id)
      onMessageSent()
    }
  }, [chatId, dispatch, onMessageSent, value, chat?.audience])

  return (
    <Box backgroundColor='white' className={props.className}>
      {trackId ? (
        <ComposerTrackInfo trackId={trackId} />
      ) : collectionId ? (
        <ComposerCollectionInfo collectionId={collectionId} />
      ) : null}
      <Box p='l'>
        <ComposerInput
          placeholder={messages.sendMessagePlaceholder}
          messageId={messageId}
          onChange={handleChange}
          onSubmit={handleSubmit}
          maxLength={MAX_MESSAGE_LENGTH}
          presetMessage={presetMessage}
        />
      </Box>
    </Box>
  )
}
