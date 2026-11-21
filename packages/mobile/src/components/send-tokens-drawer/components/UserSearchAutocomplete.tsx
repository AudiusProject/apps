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
  const navigation = useNavigation<any>()
  const callbackIdRef = useRef<string | null>(null)
  const { data: currentUserId } = useCurrentUserId()
  const { onOpen: openSendTokensDrawer } = useSendTokensModal()

  const displayValue = useMemo(() => {
    if (value) {
      return `${value.name} (@${value.handle})`
    }
    return ''
  }, [value])

  const openUserSelection = useCallback(() => {
    onBeforeNavigate?.()

    const callbackId = `user-selection-${Date.now()}-${Math.random()}`
    callbackIdRef.current = callbackId

    userSelectionCallbacks.set(callbackId, (user: User) => {
      onChange(user)
      userSelectionCallbacks.delete(callbackId)
      callbackIdRef.current = null
      setTimeout(() => {
        openSendTokensDrawer()
      }, 100)
    })

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
