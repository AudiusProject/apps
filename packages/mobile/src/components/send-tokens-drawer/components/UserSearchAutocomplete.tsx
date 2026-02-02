import { useCallback, useMemo, useRef } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import type { User } from '@audius/common/models'

import { Flex, Text, IconSearch } from '@audius/harmony-native'
import { TextInput } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { Pressable, View } from 'react-native'

const messages = {
  searchUsers: 'Search Users',
  selectUser: 'Tap to select a user'
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
}

export const UserSearchAutocomplete = ({
  value,
  onChange,
  onClear,
  excludedUserIds,
  error,
  helperText
}: UserSearchAutocompleteProps) => {
  const navigation = useNavigation()
  const callbackIdRef = useRef<string | null>(null)
  const { data: currentUserId } = useCurrentUserId()

  const displayValue = useMemo(() => {
    // Show the selected user's formatted name if a user is selected
    if (value) {
      return `${value.name} (@${value.handle})`
    }
    return messages.selectUser
  }, [value])

  const handlePress = useCallback(() => {
    // Generate a unique ID for this callback
    const callbackId = `user-selection-${Date.now()}-${Math.random()}`
    callbackIdRef.current = callbackId

    // Store the callback
    userSelectionCallbacks.set(callbackId, (user: User) => {
      onChange(user)
      userSelectionCallbacks.delete(callbackId)
      callbackIdRef.current = null
    })

    // Navigate to user selection screen with callback ID
    navigation.push('SendTokensUserSelection', {
      excludedUserIds: currentUserId
        ? [...(excludedUserIds ?? []), currentUserId]
        : excludedUserIds,
      callbackId
    })
  }, [navigation, onChange, excludedUserIds, currentUserId])

  const handleClear = useCallback(() => {
    onChange(null)
    onClear?.()
    if (callbackIdRef.current) {
      userSelectionCallbacks.delete(callbackIdRef.current)
      callbackIdRef.current = null
    }
  }, [onChange, onClear])

  return (
    <Flex gap='xs'>
      <Pressable onPress={handlePress}>
        <View pointerEvents='box-only'>
          <TextInput
            label={messages.searchUsers}
            value={displayValue}
            editable={false}
            error={error}
            placeholder={messages.selectUser}
            Icon={IconSearch}
            clearable={!!value}
            onClear={handleClear}
          />
        </View>
      </Pressable>
      {helperText ? (
        <Text variant='body' size='s' color='danger'>
          {helperText}
        </Text>
      ) : null}
    </Flex>
  )
}
