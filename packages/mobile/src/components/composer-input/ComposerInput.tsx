import type { ReactNode, Ref } from 'react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { useTrack } from '@audius/common/api'
import { useAudiusLinkResolver } from '@audius/common/hooks'
import type { ID, UserMetadata } from '@audius/common/models'
import {
  getDurationFromTimestampMatch,
  parseCommentTrackTimestamp,
  splitOnNewline,
  timestampRegex
} from '@audius/common/utils'
import { OptionalHashId } from '@audius/sdk'
import { isEqual, pick } from 'lodash'
import type { TextInput as RnTextInput } from 'react-native'
import { Platform, TouchableOpacity } from 'react-native'
import type {
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  TextInputSelectionChangeEventData
} from 'react-native/types'
import { usePrevious } from 'react-use'

import { Flex, IconSend, mergeRefs } from '@audius/harmony-native'
import { Text, TextInput } from 'app/components/core'
import { env } from 'app/services/env'
import { audiusSdk } from 'app/services/sdk/audius-sdk'
import { makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useThemeColors } from 'app/utils/theme'

import LoadingSpinner from '../loading-spinner/LoadingSpinner'

import type { ComposerInputProps } from './types'

const BACKSPACE_KEY = 'Backspace'
const AT_KEY = '@'
const SPACE_KEY = ' '
const ENTER_KEY = 'Enter'

const messages = {
  sendMessage: 'Send Message',
  sendMessagePlaceholder: 'Start typing...',
  cancelLabel: 'Cancel'
}

const createTextSections = (text: string) => {
  const splitText = splitOnNewline(text)
  return splitText.map((t) => (
    // eslint-disable-next-line react/jsx-key
    <Text allowNewline>{t}</Text>
  ))
}

const useStyles = makeStyles(({ spacing, palette, typography }) => ({
  composeTextContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingLeft: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: spacing(1),
    maxHeight: 240
  },
  composeTextInput: {
    fontSize: typography.fontSize.medium,
    lineHeight: spacing(6),
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0
  },
  submit: {
    paddingRight: spacing(1)
  },
  icon: {
    width: spacing(6),
    height: spacing(6)
  }
}))

export const ComposerInput = forwardRef(function ComposerInput(
  props: ComposerInputProps,
  ref: Ref<RnTextInput>
) {
  const styles = useStyles()
  const {
    onSubmit,
    onChange,
    onAutocompleteChange,
    onFocus,
    onAddMention,
    onAddTimestamp,
    onAddLink,
    setAutocompleteHandler,
    isLoading,
    messageId,
    placeholder,
    presetMessage,
    presetUserMentions,
    entityId,
    styles: propStyles,
    TextInputComponent,
    onLayout,
    maxLength = 10000,
    maxMentions = Infinity
  } = props

  const [value, setValue] = useState(presetMessage ?? '')
  const [autocompletePosition, setAutocompletePosition] = useState(0)
  const [isAutocompleteActive, setIsAutocompleteActive] = useState(false)
  const [userMentions, setUserMentions] = useState<string[]>(
    (presetUserMentions ?? []).map((mention) => `@${mention.handle}`)
  )
  const [userIdMap, setUserIdMap] = useState<Record<string, ID>>(
    (presetUserMentions ?? []).reduce((acc, mention) => {
      return {
        ...acc,
        [`@${mention.handle}`]: mention.userId
      }
    }, {})
  )
  const selectionRef = useRef<
    TextInputSelectionChangeEventData['selection'] | undefined
  >(undefined)
  const { primary, neutralLight7 } = useThemeColors()
  const hasLength = value.length > 0
  const internalRef = useRef<RnTextInput>(null)
  const latestValueRef = useRef(value)
  const messageIdRef = useRef(messageId)
  const lastKeyPressMsRef = useRef<number | null>(null)
  const { data: partialTrack } = useTrack(entityId, {
    select: (track) =>
      pick(track, ['duration', 'genre', 'release_date', 'access'])
  })

  useEffect(() => {
    setUserMentions(
      (presetUserMentions ?? []).map((mention) => `@${mention.handle}`)
    )
    setUserIdMap(
      (presetUserMentions ?? []).reduce((acc, mention) => {
        acc[`@${mention.handle}`] = mention.userId
        return acc
      }, {})
    )
  }, [presetUserMentions])

  const getAutocompleteRange = useCallback(() => {
    if (!isAutocompleteActive) return null

    const startPosition = Math.min(autocompletePosition, value.length)
    const endPosition = value
      .slice(startPosition + 1)
      .split('')
      .findIndex((c) => {
        return c === SPACE_KEY || c === AT_KEY
      })

    return [
      startPosition,
      endPosition === -1 ? value.length : endPosition + startPosition + 1
    ]
  }, [autocompletePosition, isAutocompleteActive, value])

  const autocompleteText = useMemo(() => {
    if (!isAutocompleteActive) return ''
    return value.slice(...getAutocompleteRange()!)
  }, [getAutocompleteRange, isAutocompleteActive, value])

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

  const mentionCount = useMemo(() => {
    return getUserMentions(value)?.length ?? 0
  }, [getUserMentions, value])

  const handleAutocomplete = useCallback(
    (user: UserMetadata) => {
      if (!user) return
      const autocompleteRange = getAutocompleteRange() ?? [0, 1]
      const mentionText = `@${user.handle}`

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

        return `${textBeforeMention}${fillText}${textAfterMention}`
      })
      onAddMention?.(user.user_id)

      setIsAutocompleteActive(false)
    },
    [getAutocompleteRange, userMentions, onAddMention]
  )

  useEffect(() => {
    onAutocompleteChange?.(isAutocompleteActive, autocompleteText.slice(1))
  }, [onAutocompleteChange, isAutocompleteActive, autocompleteText])

  useEffect(() => {
    if (isAutocompleteActive && setAutocompleteHandler) {
      setAutocompleteHandler(handleAutocomplete)
    }
  }, [handleAutocomplete, isAutocompleteActive, setAutocompleteHandler])

  const handleChange = useCallback(
    async (value: string) => {
      latestValueRef.current = value
      setValue(value)
      const editedValue = await resolveLinks(value)
      if (value !== editedValue) {
        setValue(editedValue)
      }
    },
    [resolveLinks]
  )

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      selectionRef.current = e.nativeEvent.selection
    },
    [selectionRef]
  )

  const handleSubmit = useCallback(() => {
    internalRef.current?.blur()
    setTimeout(() => {
      setValue('')
      const mentions =
        getUserMentions(latestValueRef.current)?.map((match) => {
          return {
            handle: match.text.replace('@', ''),
            userId: userIdMap[match.text]
          }
        }) ?? []
      onSubmit?.(restoreLinks(latestValueRef.current), mentions)
    }, 10)
  }, [getUserMentions, onSubmit, restoreLinks, userIdMap])

  const handleKeyDown = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      const { key } = e.nativeEvent
      const isBackspaceAvailable =
        lastKeyPressMsRef.current === null ||
        Date.now() - lastKeyPressMsRef.current > 300

      if (key === BACKSPACE_KEY) {
        if (!isBackspaceAvailable) return
      } else {
        lastKeyPressMsRef.current = Date.now()
      }

      const cursorPosition = selectionRef.current?.start
      if (isAutocompleteActive && !!cursorPosition) {
        if (key === SPACE_KEY) {
          setIsAutocompleteActive(false)
        }

        if (key === ENTER_KEY) {
          setIsAutocompleteActive(false)
        }

        if (key === BACKSPACE_KEY) {
          const deletedChar = value[cursorPosition - 1]
          if (deletedChar === AT_KEY) {
            setIsAutocompleteActive(false)
          }
        }

        const autocompleteRange = getAutocompleteRange()

        if (
          autocompleteRange &&
          (autocompleteRange[0] >= cursorPosition ||
            autocompleteRange[1] < cursorPosition)
        ) {
          setIsAutocompleteActive(false)
        }

        return
      }

      // Start user autocomplete
      if (key === AT_KEY && onAutocompleteChange) {
        if (mentionCount < maxMentions) {
          setAutocompletePosition(cursorPosition ?? 0)
          setIsAutocompleteActive(true)
        }
      }

      if (key === BACKSPACE_KEY && !!cursorPosition) {
        const textBeforeCursor = value.slice(0, cursorPosition)
        const { editValue } = handleBackspace({
          cursorPosition,
          textBeforeCursor
        })

        if (editValue) {
          // Delay the deleting of the matched word because
          // in react native text change will fire on backspace anyway
          // and we want the handleChange callback to run first.
          // This is a bit of a hack. In search of a better way!
          setTimeout(() => {
            setValue(editValue)
          }, 100)
        }
      }
    },
    [
      getAutocompleteRange,
      handleBackspace,
      isAutocompleteActive,
      onAutocompleteChange,
      selectionRef,
      value,
      mentionCount,
      maxMentions
    ]
  )

  const renderIcon = () => (
    <TouchableOpacity
      onPress={handleSubmit}
      hitSlop={spacing(2)}
      style={styles.submit}
    >
      <Flex pv='xs'>
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <IconSend
            width={styles.icon.width}
            height={styles.icon.height}
            fill={hasLength ? primary : neutralLight7}
          />
        )}
      </Flex>
    </TouchableOpacity>
  )

  const isTextHighlighted = useMemo(() => {
    const matches = getMatches(value) ?? []
    const mentions = getUserMentions(value) ?? []
    const fullMatches = [...matches, ...mentions, ...timestamps]
    return Boolean(fullMatches.length || isAutocompleteActive)
  }, [getMatches, timestamps, getUserMentions, isAutocompleteActive, value])

  const renderDisplayText = useCallback(
    (value: string) => {
      const matches = getMatches(value) ?? []
      const mentions = getUserMentions(value) ?? []
      const fullMatches = [...matches, ...mentions, ...timestamps]

      // If there are no highlightable sections, render text normally
      if (!fullMatches.length && !isAutocompleteActive) {
        return createTextSections(value)
      }

      const renderedTextSections: ReactNode[] = []
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
        const { index, text } = match
        if (index === undefined) {
          continue
        }

        if (index > lastIndex) {
          // Add text before the match
          renderedTextSections.push(
            ...createTextSections(value.slice(lastIndex, index))
          )
        }
        // Add the matched word with accent color
        renderedTextSections.push(<Text color='secondary'>{text}</Text>)

        // Update lastIndex to the end of the current match
        lastIndex = index + text.length
      }

      // Add remaining text after the last match
      if (lastIndex < value.length) {
        renderedTextSections.push(...createTextSections(value.slice(lastIndex)))
      }

      return renderedTextSections
    },
    [
      getMatches,
      timestamps,
      getUserMentions,
      isAutocompleteActive,
      getAutocompleteRange
    ]
  )

  useEffect(() => {
    if (linkEntities.length && !isEqual(linkEntities, prevLinkEntities)) {
      const { type, data } = linkEntities[linkEntities.length - 1]
      const id = OptionalHashId.parse(data.id)
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
    <>
      <TextInput
        ref={mergeRefs([ref, internalRef])}
        placeholder={placeholder ?? messages.sendMessagePlaceholder}
        Icon={renderIcon}
        styles={{
          root: [styles.composeTextContainer, propStyles?.container],
          input: [
            styles.composeTextInput,
            Platform.OS === 'ios' ? { paddingBottom: spacing(1.5) } : null
          ]
        }}
        onChangeText={handleChange}
        onKeyPress={handleKeyDown}
        onSelectionChange={handleSelectionChange}
        onLayout={onLayout}
        multiline
        inputAccessoryViewID='none'
        maxLength={maxLength}
        autoCorrect
        TextInputComponent={TextInputComponent}
        onFocus={onFocus}
      >
        {isTextHighlighted ? (
          <Text allowNewline>{renderDisplayText(value)}</Text>
        ) : (
          <Text allowNewline>{value}</Text>
        )}
      </TextInput>
    </>
  )
})
