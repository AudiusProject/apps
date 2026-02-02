import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useCurrentUserId, useUsers } from '@audius/common/api'
import type { User } from '@audius/common/models'
import { Status, SquareSizes } from '@audius/common/models'
import {
  searchUsersModalActions,
  searchUsersModalSelectors
} from '@audius/common/store'
import { FlatList, Pressable, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { useDebounce } from 'react-use'

import { Avatar, Flex, Text, IconSearch } from '@audius/harmony-native'
import { TextInput } from 'app/components/core'
import { useProfilePicture } from 'app/components/image/UserImage'
import LoadingSpinner from 'app/components/loading-spinner'
import { UserLink } from 'app/components/user-link/UserLink'

const messages = {
  searchUsers: 'Search Users',
  noUsersFound: 'No users found',
  noWalletAddress: 'This user does not have a wallet address set up'
}

const DEBOUNCE_MS = 300

const { searchUsers } = searchUsersModalActions
const { getUserList, getLastSearchQuery } = searchUsersModalSelectors

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
  const dispatch = useDispatch()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [hasQuery, setHasQuery] = useState(false)
  const containerRef = useRef<View>(null)

  const { userIds, status } = useSelector(getUserList)
  const lastSearchQuery = useSelector(getLastSearchQuery)
  const { data: currentUserId } = useCurrentUserId()

  const ids = useMemo(() => {
    const excludedUserIdsSet = new Set(excludedUserIds ?? [])
    if (currentUserId) {
      excludedUserIdsSet.add(currentUserId)
    }
    return userIds.filter((id) => !excludedUserIdsSet.has(id))
  }, [userIds, excludedUserIds, currentUserId])

  const { data: users } = useUsers(ids.length > 0 ? ids : null)

  const filteredUsers = useMemo(() => {
    return users ?? []
  }, [users])

  useDebounce(
    () => {
      if (query.trim()) {
        dispatch(searchUsers({ query: query.trim(), limit: 10 }))
        setHasQuery(true)
      } else {
        setHasQuery(false)
      }
    },
    DEBOUNCE_MS,
    [query, dispatch]
  )

  // Clear query if search state resets
  useEffect(() => {
    if (!lastSearchQuery && hasQuery) {
      setQuery('')
      setHasQuery(false)
    }
  }, [lastSearchQuery, hasQuery])

  const handleChange = useCallback(
    (text: string) => {
      setQuery(text)
      setIsOpen(true)
      // Clear the selected value when user starts typing a different value
      if (value) {
        const currentDisplayValue = `${value.name} (@${value.handle})`
        if (text !== currentDisplayValue) {
          onChange(null)
        }
      }
    },
    [value, onChange]
  )

  const handleSelectUser = useCallback(
    (user: User) => {
      onChange(user)
      setQuery(`${user.name} (@${user.handle})`)
      setIsOpen(false)
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    setQuery('')
    onChange(null)
    onClear?.()
    setIsOpen(false)
  }, [onChange, onClear])

  const displayValue = useMemo(() => {
    // Show the selected user's formatted name if a user is selected
    if (value) {
      return `${value.name} (@${value.handle})`
    }
    // Otherwise show the search query
    return query
  }, [value, query])

  const isLoading = status === Status.LOADING && hasQuery

  // Note: Dropdown closes on blur, which is handled in the TextInput onBlur prop

  return (
    <View ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <Flex gap='xs'>
        <TextInput
          label={messages.searchUsers}
          value={displayValue}
          onChangeText={handleChange}
          onFocus={() => {
            // Only open dropdown if there's no selected user or if user starts typing
            if (!value || query.trim()) {
              setIsOpen(true)
            }
          }}
          onBlur={() => {
            // Delay closing to allow for option selection
            setTimeout(() => setIsOpen(false), 200)
          }}
          error={error}
          placeholder='Search by name or handle'
          Icon={query || value ? undefined : IconSearch}
          clearable={!!(query || value)}
          onClear={handleClear}
        />
        {helperText ? (
          <Text variant='body' size='s' color='danger'>
            {helperText}
          </Text>
        ) : null}
      </Flex>

      {isOpen && query.trim() && (
        <View
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'white',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E0E0E0',
            maxHeight: 300,
            marginTop: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 5
          }}
        >
          {isLoading ? (
            <Flex p='l' alignItems='center' justifyContent='center' gap='m'>
              <LoadingSpinner style={{ width: 24, height: 24 }} />
              <Text variant='body' color='subdued'>
                Searching...
              </Text>
            </Flex>
          ) : filteredUsers.length > 0 ? (
            <FlatList
              data={filteredUsers}
              keyExtractor={(user) => user.user_id.toString()}
              renderItem={({ item: user }) => (
                <UserOption
                  user={user}
                  onSelect={handleSelectUser}
                  isSelected={value?.user_id === user.user_id}
                />
              )}
              style={{ maxHeight: 300 }}
            />
          ) : query.trim() ? (
            <Flex p='l'>
              <Text variant='body' size='s' color='subdued'>
                {messages.noUsersFound}
              </Text>
            </Flex>
          ) : null}
        </View>
      )}
    </View>
  )
}

type UserOptionProps = {
  user: User
  onSelect: (user: User) => void
  isSelected?: boolean
}

const UserOption = ({ user, onSelect, isSelected }: UserOptionProps) => {
  const profilePicture = useProfilePicture({
    userId: user.user_id,
    size: SquareSizes.SIZE_150_BY_150
  })

  return (
    <Pressable
      onPress={() => onSelect(user)}
      style={({ pressed }) => ({
        backgroundColor: isSelected || pressed ? '#F5F5F5' : 'transparent',
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
      })}
    >
      <Avatar
        source={profilePicture.source}
        borderWidth='thin'
        style={{ flexShrink: 0 }}
      />
      <Flex direction='column' flex={1} style={{ minWidth: 0 }}>
        <UserLink userId={user.user_id} disabled size='s' />
        <Text variant='body' size='xs' color='subdued' numberOfLines={1}>
          @{user.handle}
        </Text>
      </Flex>
    </Pressable>
  )
}
