import { useCallback, useMemo, useRef } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import type { User } from '@audius/common/models'
import { useSendTokensModal } from '@audius/common/store'
import { useNavigation } from '@react-navigation/native'

import { Flex, Text, IconSearch } from '@audius/harmony-native'
import { TextInput } from 'app/components/core'

const messages = {
  searchUsers: 'Search Users'
}

// Global callback store for user selection - exported so screen can access it
export const userSelectionCallbacks = new Map<string, (user: User) => void>()

type UserSearchAutocompleteProps = {
  value?: User | null
  onChange: (user: User | null) => void
  onClear?: () => void
  excludedUserIds?: number[]
  error?: boolean
  helperText?: string
  onBeforeNavigate?: () => void
}

export const UserSearchAutocomplete = ({
  value,
  onChange,
  onClear,
  excludedUserIds,
  error,
  helperText,
  onBeforeNavigate
}: UserSearchAutocompleteProps) => {
  // Use React Navigation's useNavigation directly to ensure it works from drawer context
  const navigation = useNavigation<any>()
  const callbackIdRef = useRef<string | null>(null)
  const { data: currentUserId } = useCurrentUserId()
  const { onOpen: openSendTokensDrawer } = useSendTokensModal()

  const displayValue = useMemo(() => {
    // Show the selected user's formatted name if a user is selected
    if (value) {
      return `${value.name} (@${value.handle})`
    }
    return ''
  }, [value])

  const openUserSelection = useCallback(() => {
    // Close the drawer before navigating to avoid nested bottom sheets
    onBeforeNavigate?.()

    // Generate a unique ID for this callback
    const callbackId = `user-selection-${Date.now()}-${Math.random()}`
    callbackIdRef.current = callbackId

    // Store the callback
    userSelectionCallbacks.set(callbackId, (user: User) => {
      onChange(user)
      userSelectionCallbacks.delete(callbackId)
      callbackIdRef.current = null
      // Reopen the drawer after user selection so they can see the selected user
      // Use setTimeout to ensure navigation.goBack() completes first
      setTimeout(() => {
        openSendTokensDrawer()
      }, 100)
    })

    // Navigate to user selection screen with callback ID
    // Use navigate instead of push to work from within drawer
    navigation.navigate('SendTokensUserSelection', {
      excludedUserIds: currentUserId
        ? [...(excludedUserIds ?? []), currentUserId]
        : excludedUserIds,
      callbackId
    })
  }, [
    navigation,
    onChange,
    excludedUserIds,
    currentUserId,
    onBeforeNavigate,
    openSendTokensDrawer
  ])

  const handleClear = useCallback(
    (e?: any) => {
      // Stop event propagation to prevent triggering navigation
      e?.stopPropagation?.()
      onChange(null)
      onClear?.()
      if (callbackIdRef.current) {
        userSelectionCallbacks.delete(callbackIdRef.current)
        callbackIdRef.current = null
      }
    },
    [onChange, onClear]
  )

  return (
    <Flex gap='xs'>
      <TextInput
        label={messages.searchUsers}
        value={displayValue}
        error={error}
        Icon={IconSearch}
        onClear={handleClear}
        onFocus={openUserSelection}
        onChangeText={() => {
          // Prevent any text input - this is a selector, not an input
        }}
        showSoftInputOnFocus={false}
      />
      {helperText ? (
        <Text variant='body' size='s' color='danger'>
          {helperText}
        </Text>
      ) : null}
    </Flex>
  )
}
