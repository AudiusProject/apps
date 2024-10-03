import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'

import { useGetTrackById } from '@audius/common/api'
import { useAudiusLinkResolver } from '@audius/common/hooks'
import { ID, UserMetadata } from '@audius/common/models'
import {
  getDurationFromTimestampMatch,
  splitOnNewline,
  timestampRegex
} from '@audius/common/utils'
import {
  LoadingSpinner,
  SendIcon,
  Text,
  TextProps,
  useTheme
} from '@audius/harmony'
import { EntityType } from '@audius/sdk'

import { TextAreaV2 } from 'components/data-entry/TextAreaV2'
import { audiusSdk } from 'services/audius-sdk'
import { env } from 'services/env'

import { AutocompleteText } from './components/AutocompleteText'
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
  color,
  children
}: Pick<TextProps, 'color' | 'children'>) => {
  return (
    <Text css={{ whiteSpace: 'pre-wrap', pointerEvents: 'none' }} color={color}>
      {children}
    </Text>
  )
}

const createTextSections = (text: string) => {
  const splitText = splitOnNewline(text)
  return splitText.map((t) => (
    // eslint-disable-next-line react/jsx-key
    <ComposerText color='default'>{t}</ComposerText>
  ))
}

export const ComposerInput = (props: ComposerInputProps) => {
  const {
    onChange,
    onSubmit,
    messageId,
    presetMessage,
    maxLength = 400,
    placeholder,
    isLoading,
    entityId,
    entityType,
    ...other
  } = props
  const ref = useRef<HTMLTextAreaElement>(null)
  const { data: track } = useGetTrackById({
    id: entityType === EntityType.TRACK && entityId ? entityId : -1
  })

  const firstAutocompleteResult = useRef<UserMetadata | null>(null)
  const [value, setValue] = useState(presetMessage ?? '')
  const [focused, setFocused] = useState(false)
  const [isUserAutocompleteActive, setIsUserAutocompleteActive] =
    useState(false)
  const [userMentions, setUserMentions] = useState<string[]>([])
  const [userMentionIds, setUserMentionIds] = useState<ID[]>([])
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

  const getTimestamps = useCallback(
    (value: string) => {
      if (!track || !track.access.stream) return []

      const { duration } = track
      return Array.from(value.matchAll(timestampRegex))
        .filter((match) => getDurationFromTimestampMatch(match) <= duration)
        .map((match) => ({
          type: 'timestamp',
          text: match[0],
          index: match.index,
          link: ''
        }))
    },
    [track]
  )

  const handleAutocomplete = useCallback(
    (user: UserMetadata) => {
      const cursorPosition = ref.current?.selectionStart || 0
      const atPosition = value.slice(0, cursorPosition).lastIndexOf(AT_KEY)
      const autocompleteRange = isUserAutocompleteActive
        ? [atPosition, cursorPosition]
        : [0, 1]
      const mentionText = `@${user.handle}`

      if (!userMentions.includes(mentionText)) {
        setUserMentions((mentions) => [...mentions, mentionText])
        setUserMentionIds((mentionIds) => [...mentionIds, user.user_id])
      }
      setValue((value) => {
        const textBeforeMention = value.slice(0, autocompleteRange[0])
        const textAfterMention = value.slice(autocompleteRange[1])
        return `${textBeforeMention}${mentionText}${textAfterMention}`
      })
      const textarea = ref.current
      if (textarea) {
        setTimeout(() => {
          textarea.focus()
          textarea.selectionStart = autocompleteRange[0] + mentionText.length
          textarea.selectionEnd = autocompleteRange[0] + mentionText.length
        }, 0)
      }
      setIsUserAutocompleteActive(false)
    },
    [isUserAutocompleteActive, userMentions, value]
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
    submittedRef.current = true
    changeOpIdRef.current++
    onSubmit?.(restoreLinks(value), linkEntities, userMentionIds)
    submittedRef.current = false
  }, [linkEntities, onSubmit, restoreLinks, userMentionIds, value])

  // Submit when pressing enter while not holding shift
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (isUserAutocompleteActive) {
        if (e.key === ENTER_KEY || e.key === TAB_KEY) {
          e.preventDefault()
          if (firstAutocompleteResult.current) {
            handleAutocomplete(firstAutocompleteResult.current)
          }
        }

        if (e.key === ESCAPE_KEY || e.key === SPACE_KEY) {
          setIsUserAutocompleteActive(false)
        }

        if (e.key === BACKSPACE_KEY) {
          const textarea = e.target as HTMLTextAreaElement
          const cursorPosition = textarea.selectionStart
          const deletedChar = textarea.value[cursorPosition - 1]
          if (deletedChar === AT_KEY) {
            setIsUserAutocompleteActive(false)
          }
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
        setIsUserAutocompleteActive(true)
      }

      // Delete any matched values with a single backspace
      if (e.key === BACKSPACE_KEY) {
        const textarea = e.target as HTMLTextAreaElement
        const cursorPosition = textarea.selectionStart
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
      handleAutocomplete,
      onSubmit,
      handleSubmit,
      handleBackspace
    ]
  )

  const renderDisplayText = (value: string) => {
    const cursorPosition = ref.current?.selectionStart || 0
    const matches = getMatches(value) ?? []
    const mentions = getUserMentions(value) ?? []
    const timestamps = getTimestamps(value)
    const fullMatches = [...matches, ...mentions, ...timestamps]

    // If there are no highlightable sections, render text normally
    if (!fullMatches.length && !isUserAutocompleteActive) {
      return createTextSections(value)
    }

    const renderedTextSections = []
    const atPosition = value.slice(0, cursorPosition).lastIndexOf(AT_KEY)
    const autocompleteRange = isUserAutocompleteActive
      ? [atPosition, cursorPosition]
      : null

    // Filter out matches split by an autocomplete section
    const filteredMatches = fullMatches.filter(({ index }) => {
      if (index === undefined) return false
      if (autocompleteRange) {
        return !(index >= autocompleteRange[0] && index <= autocompleteRange[1])
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
        renderedTextSections.push(
          ...createTextSections(value.slice(lastIndex, index))
        )
      }

      // Add the matched word with accent color
      if (type === 'autocomplete') {
        // Autocomplete highlight
        renderedTextSections.push(
          <AutocompleteText
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
          <ComposerText color='accent'>{text}</ComposerText>
        )
      }

      // Update lastIndex to the end of the current match
      lastIndex = index + text.length
    }

    // Add remaining text after the last match
    if (lastIndex < value.length) {
      renderedTextSections.push(...createTextSections(value.slice(lastIndex)))
    }

    return renderedTextSections
  }

  return (
    <TextAreaV2
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
      renderDisplayElement={renderDisplayText}
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
    </TextAreaV2>
  )
}
