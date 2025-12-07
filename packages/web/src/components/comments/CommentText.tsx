import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react'

import { commentsMessages as messages } from '@audius/common/messages'
import { ID, Name } from '@audius/common/models'
import {
  getDurationFromTimestampMatch,
  timestampRegex
} from '@audius/common/utils'
import { Flex, Text, TextLink } from '@audius/harmony'
import { CommentMention } from '@audius/sdk'
import { useToggle } from 'react-use'

import { LinkKind } from 'components/link'
import { UserGeneratedTextV2 } from 'components/user-generated-text/UserGeneratedTextV2'
import { track as trackEvent, make } from 'services/analytics'

import { TimestampLink } from './TimestampLink'

type CommentTextProps = {
  children: string
  mentions: CommentMention[]
  isEdited?: boolean
  isPreview?: boolean
  commentId: ID
  duration?: number
}

export const CommentText = (props: CommentTextProps) => {
  const { children, isEdited, mentions, isPreview, commentId, duration } = props
  const textRef = useRef<HTMLElement | undefined>(undefined)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isExpanded, toggleIsExpanded] = useToggle(false)

  useEffect(() => {
    setIsOverflowing(
      (textRef.current &&
        textRef.current.offsetHeight < textRef.current.scrollHeight) ||
        false
    )
  }, [children])

  const handleClickLink = useCallback(
    (e: MouseEvent, linkKind: LinkKind, linkEntityId?: ID) => {
      if (linkKind === 'mention' && linkEntityId) {
        trackEvent(
          make({
            eventName: Name.COMMENTS_CLICK_MENTION,
            userId: linkEntityId,
            commentId
          })
        )
      } else {
        trackEvent(
          make({
            eventName: Name.COMMENTS_CLICK_LINK,
            commentId,
            kind: linkKind as 'track' | 'collection' | 'user' | 'other',
            entityId: linkEntityId
          })
        )
      }
    },
    [commentId]
  )

  const handleClickTimestamp = useCallback(
    (e: MouseEvent, timestampSeconds: number) => {
      trackEvent(
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
    <Flex direction='column' alignItems='flex-start' gap='xs'>
      <UserGeneratedTextV2
        ref={textRef}
        mentions={mentions}
        internalLinksOnly
        maxLines={isExpanded ? undefined : 3}
        css={{
          textAlign: 'left',
          wordBreak: 'break-word',
          userSelect: 'text'
        }}
        suffix={
          isEdited ? <Text color='subdued'> ({messages.edited})</Text> : null
        }
        linkProps={{
          onClick: handleClickLink
        }}
        matchers={[
          {
            pattern: timestampRegex,
            renderLink: (text, _, index) => {
              const matches = [...text.matchAll(new RegExp(timestampRegex))]

              if (matches.length === 0) return null

              const timestampSeconds = getDurationFromTimestampMatch(matches[0])
              const showLink = duration && timestampSeconds <= duration

              return showLink ? (
                <TimestampLink
                  key={index}
                  timestampSeconds={timestampSeconds}
                  onClick={handleClickTimestamp}
                />
              ) : null
            }
          }
        ]}
      >
        {children}
      </UserGeneratedTextV2>

      {isOverflowing && !isPreview ? (
        <TextLink variant='visible' onClick={toggleIsExpanded}>
          {isExpanded ? messages.seeLess : messages.seeMore}
        </TextLink>
      ) : null}
    </Flex>
  )
}
