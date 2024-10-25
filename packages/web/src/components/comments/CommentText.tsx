import { useEffect, useRef, useState } from 'react'

import { useCurrentCommentSection } from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import {
  getDurationFromTimestampMatch,
  timestampRegex
} from '@audius/common/utils'
import { Flex, Text, TextLink } from '@audius/harmony'
import { CommentMention } from '@audius/sdk'
import { useToggle } from 'react-use'

import { UserGeneratedTextV2 } from 'components/user-generated-text/UserGeneratedTextV2'

import { TimestampLink } from './TimestampLink'

export type CommentTextProps = {
  children: string
  mentions: CommentMention[]
  isEdited?: boolean
  isPreview?: boolean
}

export const CommentText = (props: CommentTextProps) => {
  const { children, isEdited, mentions, isPreview } = props
  const textRef = useRef<HTMLElement>()
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [isExpanded, toggleIsExpanded] = useToggle(false)
  const {
    track: { duration }
  } = useCurrentCommentSection()

  useEffect(() => {
    setIsOverflowing(
      (textRef.current &&
        textRef.current.offsetHeight < textRef.current.scrollHeight) ||
        false
    )
  }, [children])

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
        matchers={[
          {
            pattern: timestampRegex,
            renderLink: (text, _, index) => {
              const matches = [...text.matchAll(new RegExp(timestampRegex))]

              if (matches.length === 0) return null

              const timestampSeconds = getDurationFromTimestampMatch(matches[0])
              const showLink = timestampSeconds <= duration

              return showLink ? (
                <TimestampLink
                  key={index}
                  timestampSeconds={timestampSeconds}
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
