import { memo, useCallback, useState } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { useArtistCoinMessageHeader } from '@audius/common/hooks'
import { Status } from '@audius/common/models'
import { chatSelectors } from '@audius/common/store'
import {
  formatMessageDate,
  isCollectionUrl,
  isTrackUrl
} from '@audius/common/utils'
import { HashId } from '@audius/sdk'
import type { ReactionTypes, ChatMessageReaction } from '@audius/sdk'
import { css } from '@emotion/native'
import { find } from 'linkifyjs'
import type { ViewStyle, StyleProp } from 'react-native'
import { Dimensions, Keyboard } from 'react-native'
import { useSelector } from 'react-redux'

import { Flex, spacing, Text } from '@audius/harmony-native'
import ChatTail from 'app/assets/images/ChatTail.svg'
import { Pressable, UserGeneratedText } from 'app/components/core'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'
import { zIndex } from 'app/utils/zIndex'

import { reactionMap } from '../notifications-screen/Reaction'

import { ArtistCoinHeader } from './ArtistCoinHeader'
import { ChatMessagePlaylist } from './ChatMessagePlaylist'
import { ChatMessageTrack } from './ChatMessageTrack'
import { LinkPreview } from './LinkPreview'
import { ResendMessageButton } from './ResendMessageButton'
import { REACTION_LONGPRESS_DELAY } from './constants'

const { isIdEqualToReactionsPopupMessageId, getChatMessageById } = chatSelectors

const TAIL_HORIZONTAL_OFFSET = 7

const useStyles = makeStyles(({ spacing, palette }) => ({
  bubble: {
    marginTop: spacing(2),
    borderRadius: spacing(3),
    overflow: 'hidden'
  },
  pressed: {
    backgroundColor: palette.neutralLight10
  },
  pressedIsAuthor: {
    backgroundColor: palette.secondaryLight1
  },
  messageContainer: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    backgroundColor: palette.white,
    borderRadius: spacing(3)
  },
  messageContainerHasHeader: {
    borderTopStartRadius: 0,
    borderTopEndRadius: 0
  },
  messageContainerAuthor: {
    backgroundColor: palette.secondaryLight2
  },
  tail: {
    display: 'flex',
    position: 'absolute',
    bottom: 0,
    zIndex: zIndex.CHAT_TAIL
  },
  tailIsAuthor: {
    right: -TAIL_HORIZONTAL_OFFSET
  },
  tailOtherUser: {
    left: -TAIL_HORIZONTAL_OFFSET,
    transform: [{ scaleX: -1 }]
  },
  reaction: {
    position: 'absolute',
    height: spacing(16),
    width: spacing(16)
  },
  reactionContainer: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
    bottom: spacing(8),
    gap: -spacing(12),
    height: 0
  },
  reactionContainerIsAuthor: {
    right: spacing(8)
  },
  reactionContainerOtherUser: {
    left: spacing(8),
    flexDirection: 'row'
  },
  reactionMarginBottom: {
    marginBottom: spacing(2)
  },
  unfurl: {
    width: Dimensions.get('window').width - 48,
    minHeight: 72,
    borderRadius: 0 // Undoes border radius from track/collection tiles
  }
}))

const useGetTailColor = (
  isAuthor: boolean,
  isPressed: boolean,
  hideMessage: boolean
) => {
  const styles = useStyles()
  return isPressed
    ? isAuthor && !hideMessage
      ? styles.pressedIsAuthor.backgroundColor
      : styles.pressed.backgroundColor
    : isAuthor && !hideMessage
      ? styles.messageContainerAuthor.backgroundColor
      : styles.messageContainer.backgroundColor
}

type ChatReactionProps = {
  reaction: ChatMessageReaction
}

const ChatReaction = ({ reaction }: ChatReactionProps) => {
  const styles = useStyles()

  if (!reaction || !reaction.reaction || !(reaction.reaction in reactionMap)) {
    return null
  }
  const Reaction = reactionMap[reaction.reaction as ReactionTypes]
  return <Reaction style={styles.reaction} key={reaction.user_id} isVisible />
}

type ChatMessageListItemProps = {
  messageId: string
  chatId: string
  isPopup: boolean
  style?: StyleProp<ViewStyle>
  onLongPress?: (id: string) => void
  handleClosePopup?: () => void
  itemsRef?: any
}

export const ChatMessageListItem = memo(function ChatMessageListItem(
  props: ChatMessageListItemProps
) {
  const {
    messageId,
    chatId,
    isPopup = false,
    style: styleProp,
    onLongPress,
    handleClosePopup,
    itemsRef
  } = props
  const styles = useStyles()
  const { data: userId } = useCurrentUserId()
  const message = useSelector((state) =>
    getChatMessageById(state, chatId, messageId)
  )
  const senderUserId = message ? HashId.parse(message.sender_user_id) : null
  const isAuthor = senderUserId === userId
  const [isPressed, setIsPressed] = useState(false)
  const [emptyUnfurl, setEmptyUnfurl] = useState(false)
  const links = find(message?.message ?? '')
  const link = links.filter((link) => link.type === 'url' && link.isLink)[0]
  const linkValue = link?.value
  const isUnfurlOnly = linkValue === message?.message.trim()
  const hideMessage = isUnfurlOnly && !emptyUnfurl
  const isCollection = isCollectionUrl(linkValue)
  const isTrack = isTrackUrl(linkValue)
  const tailColor = useGetTailColor(isAuthor, isPressed, hideMessage)
  const isUnderneathPopup =
    useSelector((state) =>
      isIdEqualToReactionsPopupMessageId(state, messageId)
    ) && !isPopup

  const handlePressIn = useCallback(() => {
    setIsPressed(true)
  }, [setIsPressed])

  const handlePressOut = useCallback(() => {
    setIsPressed(false)
  }, [setIsPressed])

  const handleLongPress = useCallback(() => {
    if (message?.status !== Status.ERROR) {
      onLongPress?.(messageId)
    }
  }, [message?.status, messageId, onLongPress])

  const onUnfurlEmpty = useCallback(() => {
    if (linkValue) {
      setEmptyUnfurl(true)
    }
  }, [linkValue])

  const onUnfurlSuccess = useCallback(() => {
    if (linkValue) {
      setEmptyUnfurl(false)
    }
  }, [linkValue])

  const { secondaryDark1, neutralLight7 } = useThemeColors()

  const borderBottomColor = isAuthor ? secondaryDark1 : neutralLight7
  const borderBottomWidth = hideMessage || isCollection || isTrack ? 0 : 1
  const unfurlStyles = {
    ...styles.unfurl,
    borderBottomColor,
    borderBottomWidth
  }

  const artistCoinSymbol = useArtistCoinMessageHeader({
    userId: senderUserId ?? 0,
    audience: message?.audience
  })

  const hasHeader = artistCoinSymbol || isCollection || isTrack || link

  return message ? (
    <>
      <Flex
        alignItems={isAuthor ? 'flex-end' : 'flex-start'}
        style={[
          !message.hasTail && message.reactions && message.reactions.length > 0
            ? styles.reactionMarginBottom
            : null,
          { minHeight: spacing.unit4 },
          styleProp
        ]}
      >
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={REACTION_LONGPRESS_DELAY}
          onPressIn={isPopup ? handleClosePopup : handlePressIn}
          onPressOut={isPopup ? handleClosePopup : handlePressOut}
          style={{
            opacity: isUnderneathPopup ? 0 : 1
          }}
        >
          <Flex
            style={[
              styles.bubble,
              isPressed
                ? isAuthor
                  ? styles.pressedIsAuthor
                  : styles.pressed
                : null
            ]}
            shadow='mid'
            ref={
              itemsRef
                ? (el) => {
                    if (el) {
                      itemsRef.current[messageId] = el
                    }
                  }
                : null
            }
          >
            {senderUserId ? (
              <ArtistCoinHeader
                userId={senderUserId}
                audience={message?.audience}
              />
            ) : null}
            {isCollection ? (
              <ChatMessagePlaylist
                key={`${link.value}-${link.start}-${link.end}`}
                link={link.value}
                onEmpty={onUnfurlEmpty}
                onSuccess={onUnfurlSuccess}
                styles={unfurlStyles}
              />
            ) : isTrack ? (
              <ChatMessageTrack
                key={`${link.value}-${link.start}-${link.end}`}
                link={link.value}
                onEmpty={onUnfurlEmpty}
                onSuccess={onUnfurlSuccess}
                styles={unfurlStyles}
              />
            ) : link ? (
              <LinkPreview
                key={`${link.value}-${link.start}-${link.end}`}
                chatId={chatId}
                messageId={messageId}
                href={link.href}
                onLongPress={handleLongPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                isPressed={isPressed}
                onEmpty={onUnfurlEmpty}
                onSuccess={onUnfurlSuccess}
                style={unfurlStyles}
              />
            ) : null}
            {!hideMessage ? (
              <Flex
                style={[
                  styles.messageContainer,
                  isAuthor && styles.messageContainerAuthor,
                  hasHeader && styles.messageContainerHasHeader
                ]}
              >
                <UserGeneratedText
                  variant='body'
                  lineHeight='multi'
                  color={isAuthor ? 'white' : 'default'}
                  textAlign='left'
                  linkProps={{
                    variant: isAuthor ? 'inverted' : 'visible',
                    showUnderline: true
                  }}
                  onPress={Keyboard.dismiss}
                  onLongPress={handleLongPress}
                >
                  {message.message}
                </UserGeneratedText>
              </Flex>
            ) : null}
          </Flex>
          {message.hasTail ? (
            <ChatTail
              fill={tailColor}
              style={[
                styles.tail,
                isAuthor ? styles.tailIsAuthor : styles.tailOtherUser
              ]}
            />
          ) : null}
          {message.reactions?.length > 0 ? (
            <>
              {!isUnderneathPopup ? (
                <Flex
                  style={[
                    styles.reactionContainer,
                    isAuthor
                      ? styles.reactionContainerIsAuthor
                      : styles.reactionContainerOtherUser
                  ]}
                >
                  {message?.reactions.map((reaction) => {
                    return (
                      <ChatReaction
                        key={reaction.created_at}
                        reaction={reaction}
                      />
                    )
                  })}
                </Flex>
              ) : null}
            </>
          ) : null}
        </Pressable>
        {isAuthor && message.status === Status.ERROR ? (
          <ResendMessageButton messageId={messageId} chatId={chatId} />
        ) : null}
        {message.hasTail ? (
          <>
            {!isPopup ? (
              <Flex mt='s' mb='xl' style={css({ zIndex: -1 })}>
                <Text size='xs' color='subdued'>
                  {isUnderneathPopup
                    ? ' '
                    : formatMessageDate(message.created_at)}
                </Text>
              </Flex>
            ) : null}
          </>
        ) : null}
      </Flex>
    </>
  ) : null
})
