import { useCallback, useState } from 'react'

import { commentsMessages as messages } from '@audius/common/messages'
import { Name, type ID } from '@audius/common/models'
import {
  getDurationFromTimestampMatch,
  timestampRegex
} from '@audius/common/utils'
import type { CommentMention } from '@audius/sdk/services'
import type { NavigationProp, ParamListBase } from '@react-navigation/native'
import type { GestureResponderEvent } from 'react-native'
import { useToggle } from 'react-use'

import { Flex, Text, TextLink } from '@audius/harmony-native'
import { UserGeneratedText } from 'app/components/core'
import type { LinkKind } from 'app/harmony-native/components/TextLink/types'
import { make, track } from 'app/services/analytics'

import { TimestampLink } from './TimestampLink'

const MAX_LINES = 3

export type CommentTextProps = {
  children: string
  mentions: CommentMention[]
  isEdited?: boolean
  isPreview?: boolean
  commentId: ID
  trackDuration: number
  renderTimestamps?: boolean
  onCloseDrawer?: () => void
  navigation?: NavigationProp<ParamListBase>
}

export const CommentText = (props: CommentTextProps) => {
  const {
    children,
    isEdited,
    isPreview,
    mentions,
    commentId,
    trackDuration,
    onCloseDrawer,
    renderTimestamps = true,
    navigation
  } = props
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isExpanded, toggleIsExpanded] = useToggle(false)

  const onTextLayout = useCallback(
    (e) => {
      if (e.nativeEvent.lines.length > MAX_LINES && !isOverflowing) {
        setIsOverflowing(true)
      }
    },
    [isOverflowing]
  )

  const handlePressLink = useCallback(
    (e: GestureResponderEvent, linkKind: LinkKind, linkEntityId?: ID) => {
      if (linkKind === 'mention' && linkEntityId) {
        track(
          make({
            eventName: Name.COMMENTS_CLICK_MENTION,
            userId: linkEntityId,
            commentId
          })
        )
      } else {
        track(
          make({
            eventName: Name.COMMENTS_CLICK_LINK,
            commentId,
            kind: linkKind as 'track' | 'collection' | 'user' | 'other',
            entityId: linkEntityId
          })
        )
      }
      onCloseDrawer?.()
    },
    [onCloseDrawer, commentId]
  )

  const handlePressTimestamp = useCallback(
    (e: GestureResponderEvent, timestampSeconds: number) => {
      track(
        make({
          eventName: Name.COMMENTS_CLICK_TIMESTAMP,
          commentId,
          timestamp: timestampSeconds
        })
      )
    },
    [commentId]
  )

  return (
    <Flex alignItems='flex-start' gap='xs'>
      <UserGeneratedText
        variant='body'
        lineHeight='multi'
        mentions={mentions}
        onTextLayout={onTextLayout}
        numberOfLines={isOverflowing && !isExpanded ? MAX_LINES : undefined}
        internalLinksOnly
        navigation={navigation}
        linkProps={{
          onPress: handlePressLink
        }}
        suffix={
          isEdited ? (
            <>
              <Text>&nbsp;</Text>
              <Text color='subdued'>({messages.edited})</Text>
            </>
          ) : null
        }
        matchers={[
          {
            pattern: timestampRegex,
            renderLink: (text) => {
              const matches = [...text.matchAll(timestampRegex)]
              if (matches.length === 0) return null

              const timestampSeconds = getDurationFromTimestampMatch(matches[0])
              const showLink =
                renderTimestamps && timestampSeconds <= trackDuration

              return showLink ? (
                <TimestampLink
                  timestampSeconds={timestampSeconds}
                  onPress={handlePressTimestamp}
                />
              ) : (
                <Text>{text}</Text>
              )
            }
          }
        ]}
      >
        {children}
      </UserGeneratedText>

      {isOverflowing && !isPreview ? (
        <TextLink variant='visible' onPress={toggleIsExpanded}>
          {isExpanded ? messages.seeLess : messages.seeMore}
        </TextLink>
      ) : null}
    </Flex>
  )
}
