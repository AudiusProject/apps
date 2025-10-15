import { useCallback, useRef, useState } from 'react'

import { useCurrentUserId, useUsers } from '@audius/common/api'
import { useCanSendMessage } from '@audius/common/hooks'
import { Status, ChatMessageWithExtras } from '@audius/common/models'
import { chatActions, chatSelectors } from '@audius/common/store'
import {
  formatMessageDate,
  isCollectionUrl,
  isTrackUrl
} from '@audius/common/utils'
import { Flex, IconError, IconPlus } from '@audius/harmony'
import { HashId, Id, OptionalHashId, ReactionTypes } from '@audius/sdk'
import cn from 'classnames'
import { find } from 'linkifyjs'
import { useDispatch } from 'react-redux'

import { useSelector } from 'common/hooks/useSelector'
import { reactionMap } from 'components/notification/Notification/components/Reaction'
import { UserGeneratedTextV2 } from 'components/user-generated-text/UserGeneratedTextV2'

import ChatTail from '../../../assets/img/ChatTail.svg'

import { ArtistCoinHeader } from './ArtistCoinHeader'
import { CONTENT_EXPANDED_LISTENER_KEY } from './ChatMessageList'
import styles from './ChatMessageListItem.module.css'
import { ChatMessagePlaylist } from './ChatMessagePlaylist'
import { ChatMessageTrack } from './ChatMessageTrack'
import { LinkPreview } from './LinkPreview'
import { ReactionPopupMenu } from './ReactionPopupMenu'

const { setMessageReaction, sendMessage } = chatActions
const { getChat } = chatSelectors

type ChatMessageListItemProps = {
  chatId: string
  message: ChatMessageWithExtras
  hasTail: boolean
}

const messages = {
  error: 'Message Failed to Send. Click to Retry.',
  membersOnly: 'Members Only'
}

export const ChatMessageListItem = (props: ChatMessageListItemProps) => {
  const { chatId, message, hasTail } = props

  // Refs
  const reactionButtonRef = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()

  // State
  const [isReactionPopupVisible, setReactionPopupVisible] = useState(false)
  const [emptyUnfurl, setEmptyUnfurl] = useState(false)

  // Selectors
  const { data: userId } = useCurrentUserId()
  const { byId: reactionUsers } = useUsers(
    message.reactions?.map((r) => HashId.parse(r.user_id))
  )
  const chat = useSelector((state) => getChat(state, chatId ?? ''))

  // Derived
  const senderUserId = HashId.parse(message.sender_user_id)
  const isAuthor = userId === senderUserId
  const links = find(message.message)
  const link = links.filter((link) => link.type === 'url' && link.isLink)[0]
  const linkValue = link?.value
  const isUnfurlOnly = linkValue === message.message.trim()
  const hideMessage = isUnfurlOnly && !emptyUnfurl

  // Callbacks
  const handleOpenReactionPopupButtonClicked = useCallback(
    () => setReactionPopupVisible((isVisible) => !isVisible),
    [setReactionPopupVisible]
  )
  const handleCloseReactionPopup = useCallback(
    () => setReactionPopupVisible(false),
    [setReactionPopupVisible]
  )
  const handleReactionSelected = useCallback(
    (reaction: ReactionTypes) => {
      if (userId) {
        dispatch(
          setMessageReaction({
            userId,
            chatId,
            messageId: message.message_id,
            reaction:
              message.reactions?.find((r) => r.user_id === Id.parse(userId))
                ?.reaction === reaction
                ? null
                : reaction
          })
        )
      }
      handleCloseReactionPopup()
    },
    [dispatch, handleCloseReactionPopup, userId, chatId, message]
  )

  const handleResendClicked = useCallback(() => {
    dispatch(
      sendMessage({
        chatId,
        message: message.message,
        resendMessageId: message.message_id
      })
    )
  }, [dispatch, chatId, message.message, message.message_id])

  const onUnfurlEmpty = useCallback(() => {
    if (linkValue) {
      setEmptyUnfurl(true)
    }
  }, [linkValue])

  const onUnfurlSuccess = useCallback(() => {
    if (linkValue) {
      setEmptyUnfurl(false)
      // Notify the message list that content expanded so it can adjust scroll
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(CONTENT_EXPANDED_LISTENER_KEY, {
            detail: { chatId }
          })
        )
      }
    }
  }, [linkValue, chatId])

  // Only render reactions if user has message permissions
  const { canSendMessage } = useCanSendMessage(chatId)
  const renderReactions = () => {
    if (!canSendMessage || chat?.is_blast) return null

    return (
      <Flex
        ref={reactionButtonRef}
        className={cn(styles.reactionsContainer, {
          [styles.isOpened]: isReactionPopupVisible,
          [styles.hasReaction]:
            message.reactions && message.reactions.length > 0
        })}
        onClick={handleOpenReactionPopupButtonClicked}
      >
        {message.reactions?.length > 0 ? (
          message.reactions.map((reaction) => {
            if (!reaction.reaction || !(reaction.reaction in reactionMap)) {
              return null
            }
            const Reaction = reactionMap[reaction.reaction as ReactionTypes]
            return (
              <Reaction
                className={styles.reactionEmoji}
                key={reaction.user_id}
                width={48}
                height={48}
                title={
                  reactionUsers[OptionalHashId.parse(reaction.user_id)!]?.name
                }
                disableClickAnimation
              />
            )
          })
        ) : (
          <Flex className={cn(styles.reactionsButton)}>
            <IconPlus className={styles.addReactionIcon} />
          </Flex>
        )}
      </Flex>
    )
  }

  return (
    <Flex
      className={cn(styles.root, {
        [styles.isAuthor]: isAuthor,
        [styles.hasReaction]: !hasTail && message.reactions?.length > 0
      })}
    >
      <Flex
        className={cn(styles.bubble, {
          [styles.nonInteractive]: !canSendMessage,
          [styles.hideMessage]: hideMessage
        })}
      >
        <Flex className={styles.bubbleCorners}>
          <Flex column>
            <ArtistCoinHeader
              userId={senderUserId}
              audience={message.audience}
            />
            {isCollectionUrl(linkValue) ? (
              <ChatMessagePlaylist
                className={styles.unfurl}
                link={link.value}
                onEmpty={onUnfurlEmpty}
                onSuccess={onUnfurlSuccess}
              />
            ) : isTrackUrl(linkValue) ? (
              <ChatMessageTrack
                className={styles.unfurl}
                link={link.value}
                onEmpty={onUnfurlEmpty}
                onSuccess={onUnfurlSuccess}
              />
            ) : link ? (
              <LinkPreview
                className={styles.unfurl}
                href={link.href}
                chatId={chatId}
                messageId={message.message_id}
                onEmpty={onUnfurlEmpty}
                onSuccess={onUnfurlSuccess}
              />
            ) : null}
            {!hideMessage ? (
              <Flex p='l' className={styles.textWrapper}>
                <UserGeneratedTextV2
                  className={styles.text}
                  color={isAuthor ? 'white' : 'default'}
                  textAlign='left'
                  linkProps={{
                    variant: isAuthor ? 'inverted' : 'visible',
                    showUnderline: true
                  }}
                >
                  {message.message}
                </UserGeneratedTextV2>
              </Flex>
            ) : null}
          </Flex>
        </Flex>
        {renderReactions()}
        {hasTail ? (
          <Flex className={styles.tail}>
            <ChatTail />
          </Flex>
        ) : null}
      </Flex>
      {canSendMessage && !chat?.is_blast ? (
        <ReactionPopupMenu
          anchorRef={reactionButtonRef}
          isVisible={isReactionPopupVisible}
          onClose={handleCloseReactionPopup}
          isAuthor={isAuthor}
          onSelected={handleReactionSelected}
        />
      ) : null}
      {message.status === Status.ERROR ? (
        <Flex
          className={cn(styles.meta, styles.error)}
          onClick={handleResendClicked}
        >
          <IconError /> {messages.error}
        </Flex>
      ) : hasTail ? (
        <Flex className={styles.meta}>
          {formatMessageDate(message.created_at)}
        </Flex>
      ) : null}
    </Flex>
  )
}
