import {
  ChangeEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { useTrack } from '@audius/common/api'
import { useAudiusLinkResolver } from '@audius/common/hooks'
import { ID, UserMetadata } from '@audius/common/models'
import {
  getDurationFromTimestampMatch,
  parseCommentTrackTimestamp,
  splitOnNewline,
  timestampRegex
} from '@audius/common/utils'
import {
  LoadingSpinner,
  SendIcon,
  Text,
  TextProps,
  useTheme,
  TextArea
} from '@audius/harmony'
import { EntityType, HashId } from '@audius/sdk'
import { isEqual, pick } from 'lodash'
import { usePrevious } from 'react-use'

import { audiusSdk } from 'services/audius-sdk'
import { env } from 'services/env'

import { UserMentionAutocompleteText } from './components/UserMentionAutocompleteText'
import { ComposerInputProps } from './types'

const messages = {
  sendMessage: 'Send Message',
  sendMessagePlaceholder: 'Start typing...'
}

const MAX_LENGTH_DISPLAY_PERCENT = 0.85
const ENTER_KEY = 'Enter'
const TAB_KEY = 'Tab'
const BACKSPACE_KEY = 'Backspace'
const AT_KEY = '@'
const ESCAPE_KEY = 'Escape'
const SPACE_KEY = ' '

const ComposerText = ({
  color = 'default',
  children
}: Pick<TextProps, 'color' | 'children'>) => {
  return (
    <Text css={{ whiteSpace: 'pre-wrap', pointerEvents: 'none' }} color={color}>
      {children}
    </Text>
  )
}

const createTextSections = (text: string, lineIndex: number): ReactNode[] => {
  const splitText = splitOnNewline(text)

  return splitText.map((t, index) => (
    <ComposerText key={`${t}-${index + lineIndex}`}>{t}</ComposerText>
  ))
}

export const ComposerInput = (props: ComposerInputProps) => {
  const {
    onChange,
    onSubmit,
    blurOnSubmit = false,
    messageId,
    presetMessage,
    presetUserMentions = [],
    maxLength = 400,
    maxMentions = Infinity,
    placeholder,
    isLoading,
    entityId,
    entityType,
    autoFocus,
    onAddLink,
    onAddMention,
    onAddTimestamp,
    ...other
  } = props
  const ref = useRef<HTMLTextAreaElement>(null)
  const { data: partialTrack } = useTrack(entityId, {
    select: (track) => pick(track, ['access', 'duration']),
    enabled: entityType === EntityType.TRACK
  })

  const [value, setValue] = useState(presetMessage ?? '')
  const [focused, setFocused] = useState(false)
  const [autocompleteAtIndex, setAutocompleteAtIndex] = useState(0)
  const firstAutocompleteResult = useRef<UserMetadata | null>(null)
  const [isUserAutocompleteActive, setIsUserAutocompleteActive] =
    useState(false)

  const [userMentions, setUserMentions] = useState<string[]>(
    presetUserMentions.map((mention) => `@${mention.handle}`)
  )
  const [userIdMap, setUserIdMap] = useState<Record<string, ID>>(
    presetUserMentions.reduce((acc, mention) => {
      acc[`@${mention.handle}`] = mention.userId
      return acc
    }, {})
  )
  const { color } = useTheme()
  const messageIdRef = useRef(messageId)
  // Ref to keep track of the submit state of the input
  const submittedRef = useRef(false)
  // Ref to keep track of a unique id for each change
  const changeOpIdRef = useRef(0)

  const {
    linkEntities,
    resolveLinks,
    restoreLinks,
    getMatches,
    handleBackspace
  } = useAudiusLinkResolver({
    value,
    hostname: env.PUBLIC_HOSTNAME,
    audiusSdk
  })

  const prevLinkEntities = usePrevious(linkEntities)

  useEffect(() => {
    const fn = async () => {
      if (presetMessage) {
        const editedValue = await resolveLinks(presetMessage)
        setValue(editedValue)
      }
    }
    fn()
  }, [presetMessage, resolveLinks])

  useEffect(() => {
    if (ref.current && autoFocus) {
      ref.current.focus()
      ref.current.selectionStart = ref.current.value.length
    }
  }, [autoFocus])

  useEffect(() => {
    onChange?.(restoreLinks(value), linkEntities)
  }, [linkEntities, onChange, restoreLinks, value])

  useEffect(() => {
    if (messageId !== messageIdRef.current) {
      messageIdRef.current = messageId
      setValue('')
    }
  }, [messageId])

  const getUserMentions = useCallback(
    (value: string) => {
      const regexString = [...userMentions]
        .sort((a, b) => b.length - a.length)
        .join('|')
      const regex = regexString.length ? new RegExp(regexString, 'g') : null

      return regex
        ? Array.from(value.matchAll(regex)).map((match) => ({
            type: 'mention',
            text: match[0],
            index: match.index,
            link: ''
          }))
        : null
    },
    [userMentions]
  )

  const timestamps = useMemo(() => {
    if (!partialTrack || !partialTrack.access.stream) return []

    const { duration } = partialTrack
    return Array.from(value.matchAll(timestampRegex))
      .filter((match) => getDurationFromTimestampMatch(match) <= duration)
      .map((match) => ({
        type: 'timestamp',
        text: match[0],
        index: match.index,
        link: ''
      }))
  }, [partialTrack, value])
  const prevTimestamps = usePrevious(timestamps)

  const getAutocompleteRange = useCallback(() => {
    if (!isUserAutocompleteActive) return null

    const startPosition = Math.min(autocompleteAtIndex, value.length)
    const endPosition = value
      .slice(startPosition + 1)
      .split('')
      .findIndex((c) => {
        return c === ' ' || c === AT_KEY
      })

    return [
      startPosition,
      endPosition === -1 ? value.length : endPosition + startPosition + 1
    ]
  }, [autocompleteAtIndex, isUserAutocompleteActive, value])

  const mentionCount = useMemo(() => {
    return getUserMentions(value)?.length ?? 0
  }, [getUserMentions, value])

  const handleAutocomplete = useCallback(
    (user: UserMetadata) => {
      const autocompleteRange = getAutocompleteRange() ?? [0, 1]
      const mentionText = `@${user.handle}`
      let textLength = mentionText.length

      if (!userMentions.includes(mentionText)) {
        setUserMentions((mentions) => [...mentions, mentionText])
        setUserIdMap((map) => {
          map[mentionText] = user.user_id
          return map
        })
      }
      setValue((value) => {
        const textBeforeMention = value.slice(0, autocompleteRange[0])
        const textAfterMention = value.slice(autocompleteRange[1])
        const fillText =
          mentionText + (textAfterMention.startsWith(' ') ? '' : ' ')

        textLength = fillText.length

        return `${textBeforeMention}${fillText}${textAfterMention}`
      })
      const textarea = ref.current
      if (textarea) {
        setTimeout(() => {
          textarea.focus()
          textarea.selectionStart = autocompleteRange[0] + textLength
          textarea.selectionEnd = autocompleteRange[0] + textLength
        }, 0)
      }
      setIsUserAutocompleteActive(false)
      onAddMention?.(user.user_id)
    },
    [getAutocompleteRange, userMentions, onAddMention]
  )

  const handleChange = useCallback(
    async (e: ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value)
      const currentOpId = ++changeOpIdRef.current
      const editedValue = await resolveLinks(e.target.value)
      if (submittedRef.current || currentOpId !== changeOpIdRef.current) {
        return
      }
      setValue(editedValue)
      // TODO: Need to update this to move to the proper position affect link change to human text
      // setTimeout(() => {
      //   textarea.selectionStart = cursorPosition
      //   textarea.selectionEnd = cursorPosition
      // }, 0)
    },
    [resolveLinks, setValue, submittedRef]
  )

  const handleSubmit = useCallback(() => {
    if (blurOnSubmit && ref.current) {
      ref.current.blur()
    }
    submittedRef.current = true
    changeOpIdRef.current++
    const mentions =
      getUserMentions(value)?.map((match) => {
        return {
          handle: match.text.replace('@', ''),
          userId: userIdMap[match.text]
        }
      }) ?? []
    onSubmit?.(restoreLinks(value), linkEntities, mentions)
    submittedRef.current = false
    setUserMentions([])
    setUserIdMap({})
  }, [
    blurOnSubmit,
    getUserMentions,
    linkEntities,
    onSubmit,
    restoreLinks,
    userIdMap,
    value
  ])

  // Submit when pressing enter while not holding shift
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = ref.current as HTMLTextAreaElement
      const cursorPosition = textarea.selectionStart

      if (isUserAutocompleteActive) {
        if (e.key === TAB_KEY) {
          e.preventDefault()
          if (firstAutocompleteResult.current) {
            handleAutocomplete(firstAutocompleteResult.current)
          }
        }

        if (e.key === ESCAPE_KEY || e.key === SPACE_KEY) {
          setIsUserAutocompleteActive(false)
        }

        if (e.key === BACKSPACE_KEY) {
          const deletedChar = textarea.value[cursorPosition - 1]
          if (deletedChar === AT_KEY) {
            setIsUserAutocompleteActive(false)
          }
        }

        const autocompleteRange = getAutocompleteRange()

        if (
          autocompleteRange &&
          (autocompleteRange[0] >= cursorPosition ||
            autocompleteRange[1] < cursorPosition)
        ) {
          setIsUserAutocompleteActive(false)
        }

        return
      }

      // Submit on enter
      if (e.key === ENTER_KEY && !e.shiftKey) {
        if (onSubmit) {
          e.preventDefault()
          handleSubmit()
        }
      }

      // Start user autocomplete
      if (e.key === AT_KEY) {
        // Only trigger autocomplete if @ is at the start of input or after a space
        const textBeforeCursor = textarea.value.slice(0, cursorPosition)
        const isAtStartOfWordOrInput =
          !textBeforeCursor || textBeforeCursor.endsWith(' ')
        if (mentionCount < maxMentions && isAtStartOfWordOrInput) {
          setAutocompleteAtIndex(cursorPosition)
          setIsUserAutocompleteActive(true)
        }
      }

      // Delete any matched values with a single backspace
      if (e.key === BACKSPACE_KEY) {
        const textBeforeCursor = textarea.value.slice(0, cursorPosition)
        const { editValue, newCursorPosition } = handleBackspace({
          cursorPosition,
          textBeforeCursor
        })
        if (editValue) {
          e.preventDefault()
          setValue(editValue)
          setTimeout(() => {
            textarea.selectionStart = newCursorPosition
            textarea.selectionEnd = newCursorPosition
          }, 0)
        }
      }
    },
    [
      isUserAutocompleteActive,
      getAutocompleteRange,
      handleAutocomplete,
      onSubmit,
      handleSubmit,
      handleBackspace,
      maxMentions,
      mentionCount
    ]
  )

  const isTextHighlighted = useMemo(() => {
    const matches = getMatches(value) ?? []
    const mentions = getUserMentions(value) ?? []
    const fullMatches = [...matches, ...mentions, ...timestamps]
    return Boolean(fullMatches.length || isUserAutocompleteActive)
  }, [getMatches, timestamps, getUserMentions, isUserAutocompleteActive, value])

  const renderDisplayText = useCallback(
    (value: string) => {
      // Line index is used to keep track of the index of the last text section
      // so that we do not have duplicate keys in the rendered text sections
      let lineIndex = 0
      const matches = getMatches(value) ?? []
      const mentions = getUserMentions(value) ?? []
      const fullMatches = [...matches, ...mentions, ...timestamps]

      // If there are no highlightable sections, render text normally
      if (!fullMatches.length && !isUserAutocompleteActive) {
        return createTextSections(value, lineIndex)
      }

      const renderedTextSections = []
      const autocompleteRange = getAutocompleteRange()

      // Filter out matches split by an autocomplete section
      const filteredMatches = fullMatches.filter(({ index }) => {
        if (index === undefined) return false
        if (autocompleteRange) {
          return !(
            index >= autocompleteRange[0] && index <= autocompleteRange[1]
          )
        }
        return true
      })

      // Add the autocomplete section
      if (
        autocompleteRange &&
        autocompleteRange[0] >= 0 &&
        autocompleteRange[1] >= autocompleteRange[0]
      ) {
        filteredMatches.push({
          type: 'autocomplete',
          text: value.slice(autocompleteRange[0], autocompleteRange[1]),
          index: autocompleteRange[0],
          link: ''
        })
      }

      // Sort match sections by index
      const sortedMatches = filteredMatches.sort(
        (a, b) => (a.index ?? 0) - (b.index ?? 0)
      )

      let lastIndex = 0
      for (const match of sortedMatches) {
        const { type, text, index } = match
        if (index === undefined) continue

        // Add text before the match
        if (index > lastIndex) {
          const textSections = createTextSections(
            value.slice(lastIndex, index),
            lineIndex
          )
          renderedTextSections.push(...textSections)
          lineIndex += textSections.length
        }

        // Add the matched word with accent color
        if (type === 'autocomplete') {
          // Autocomplete highlight
          renderedTextSections.push(
            <UserMentionAutocompleteText
              key={`${text}-${index}`}
              text={text}
              onConfirm={handleAutocomplete}
              onResultsLoaded={(results) => {
                firstAutocompleteResult.current = results[0] ?? null
              }}
            />
          )
        } else {
          // User Mention or Link match
          renderedTextSections.push(
            <ComposerText key={`${text}-${index}`} color='accent'>
              {text}
            </ComposerText>
          )
        }

        // Update lastIndex to the end of the current match
        lastIndex = index + text.length
      }

      // Add remaining text after the last match
      if (lastIndex < value.length) {
        const textSections = createTextSections(
          value.slice(lastIndex),
          lineIndex
        )
        renderedTextSections.push(...textSections)
        lineIndex += textSections.length
      }

      return renderedTextSections
    },
    [
      getAutocompleteRange,
      getMatches,
      getUserMentions,
      handleAutocomplete,
      isUserAutocompleteActive,
      timestamps
    ]
  )

  useEffect(() => {
    if (linkEntities.length && !isEqual(linkEntities, prevLinkEntities)) {
      const { type, data } = linkEntities[linkEntities.length - 1]
      const id = HashId.parse(data.id)
      if (id) {
        onAddLink?.(id, type)
      }
    }
  }, [linkEntities, onAddLink, prevLinkEntities])

  useEffect(() => {
    if (timestamps.length && !isEqual(timestamps, prevTimestamps)) {
      onAddTimestamp?.(
        parseCommentTrackTimestamp(timestamps[timestamps.length - 1].text)
      )
    }
  }, [onAddTimestamp, timestamps, prevTimestamps])

  return (
    <TextArea
      css={{
        '&&': {
          paddingBlock: 6,
          border: `1px solid ${
            focused ? color.border.accent : color.border.default
          }`
        }
      }}
      ref={ref}
      rows={1}
      placeholder={placeholder ?? messages.sendMessagePlaceholder}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      value={value}
      maxVisibleRows={10}
      maxLength={maxLength}
      showMaxLength={
        !!value && value.length > maxLength * MAX_LENGTH_DISPLAY_PERCENT
      }
      renderDisplayElement={isTextHighlighted ? renderDisplayText : undefined}
      grows
      {...other}
    >
      {isLoading ? (
        <LoadingSpinner css={{ height: 32, width: 32 }} />
      ) : (
        <SendIcon
          onClick={onSubmit ? handleSubmit : undefined}
          disabled={!value || isLoading || other.disabled}
        />
      )}
    </TextArea>
  )
}
