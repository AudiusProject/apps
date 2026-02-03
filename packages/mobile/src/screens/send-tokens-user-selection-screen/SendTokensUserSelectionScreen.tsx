import { useCallback, useEffect, useState } from 'react'

import {
  useCurrentUserId,
  useFollowers,
  useSearchUserResults
} from '@audius/common/api'
import type { User } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { useSendTokensModal } from '@audius/common/store'
import { Pressable, View } from 'react-native'
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view'
import { useDebounce } from 'react-use'

import { IconSearch, Avatar, Flex, Text, Divider } from '@audius/harmony-native'
import {
  Screen,
  ScreenContent,
  TextInput,
  HeaderShadow
} from 'app/components/core'
import { useProfilePicture } from 'app/components/image/UserImage'
import LoadingSpinner from 'app/components/loading-spinner'
import { userSelectionCallbacks } from 'app/components/send-tokens-drawer/components/UserSearchAutocomplete'
import { UserLink } from 'app/components/user-link/UserLink'
import { useNavigation } from 'app/hooks/useNavigation'
import { useRoute } from 'app/hooks/useRoute'

const DEBOUNCE_MS = 300

const messages = {
  title: 'Select Recipient',
  search: ' Search Users'
}

type UserItemProps = {
  user: User
  onSelect: (user: User) => void
}

const UserItem = ({ user, onSelect }: UserItemProps) => {
  const profilePicture = useProfilePicture({
    userId: user.user_id,
    size: SquareSizes.SIZE_150_BY_150
  })

  return (
    <Pressable
      onPress={() => onSelect(user)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.5 : 1
      })}
    >
      <Flex
        row
        gap='s'
        alignItems='center'
        ph='m'
        pv='s'
        borderBottom='default'
      >
        <Avatar source={profilePicture.source} />
        <Flex flex={1} style={{ minWidth: 0 }}>
          <UserLink userId={user.user_id} disabled />
          <Text variant='body' size='s' color='default' numberOfLines={1}>
            @{user.handle}
          </Text>
        </Flex>
      </Flex>
    </Pressable>
  )
}

export const SendTokensUserSelectionScreen = () => {
  const [inputValue, setInputValue] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const navigation = useNavigation()
  const { params } = useRoute<'SendTokensUserSelection'>()
  const excludedUserIds = params?.excludedUserIds
  const callbackId = params?.callbackId
  const { onOpen: openSendTokensDrawer } = useSendTokensModal()

  // Debounce the search query
  useDebounce(
    () => {
      setDebouncedQuery(inputValue)
    },
    DEBOUNCE_MS,
    [inputValue]
  )

  // Handle back button press to reopen drawer
  const handleBack = useCallback(() => {
    // Only reopen drawer if callback still exists (user didn't select someone)
    if (callbackId && userSelectionCallbacks.has(callbackId)) {
      // Clean up the callback
      userSelectionCallbacks.delete(callbackId)
      // Reopen the send drawer after navigation completes
      setTimeout(() => {
        openSendTokensDrawer()
      }, 150)
    }
  }, [callbackId, openSendTokensDrawer])

  // Clean up callback if component unmounts without user selection
  useEffect(() => {
    return () => {
      if (callbackId && userSelectionCallbacks.has(callbackId)) {
        userSelectionCallbacks.delete(callbackId)
      }
    }
  }, [callbackId])

  const { data: currentUserId } = useCurrentUserId()

  // Fetch current user's followers for zero state
  const { users: followerUsers, isPending: isLoadingFollowers } = useFollowers(
    { userId: currentUserId ?? null, pageSize: 20 },
    { enabled: !!currentUserId }
  )
  // Filter out excluded users from followers
  const filteredFollowerUsers = followerUsers?.filter(
    (user) => !excludedUserIds?.includes(user.user_id)
  )

  // Use tan-query for user search with debounced query
  const {
    data: searchUsers,
    isPending: isSearchPending,
    loadNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useSearchUserResults(
    {
      query: debouncedQuery.trim(),
      pageSize: 20
    },
    {
      enabled: debouncedQuery.trim().length > 0
    }
  )

  // Filter out excluded users (data is already flattened by FlatUseInfiniteQueryResult)
  const filteredUsers = (searchUsers ?? []).filter(
    (user) => !excludedUserIds?.includes(user.user_id)
  )

  const handleClear = useCallback(() => {
    setInputValue('')
    setDebouncedQuery('')
  }, [])

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      loadNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, loadNextPage])

  const handleSelectUser = useCallback(
    (user: User) => {
      if (callbackId) {
        const callback = userSelectionCallbacks.get(callbackId)
        if (callback) {
          // Callback will handle reopening the drawer and updating state
          callback(user)
        }
        // Clean up the callback
        userSelectionCallbacks.delete(callbackId)
      }
      // Close the user selection screen
      navigation.goBack()
    },
    [callbackId, navigation]
  )

  const hasNoQuery = !debouncedQuery.trim()
  const isLoading = isSearchPending && debouncedQuery.trim().length > 0

  return (
    <Screen
      url='/send-tokens-user-selection'
      title={messages.title}
      icon={IconSearch}
      variant='secondary'
      topbarRight={null}
      onBack={handleBack}
    >
      <ScreenContent>
        <HeaderShadow />
        <Flex style={{ flexGrow: 1 }} backgroundColor='white'>
          <Flex mt='xl' ph='xs' pb='xs'>
            {filteredUsers && filteredUsers.length > 0 && <Divider />}
            <TextInput
              placeholder={messages.search}
              autoFocus={true}
              Icon={IconSearch}
              styles={{
                root: {
                  paddingRight: 20,
                  paddingLeft: 16,
                  paddingVertical: 24
                },
                input: {
                  fontWeight: '600',
                  fontSize: 18
                }
              }}
              iconProp={{ height: 24, width: 24 }}
              onChangeText={setInputValue}
              value={inputValue}
              inputAccessoryViewID='none'
              clearable={true}
              onClear={handleClear}
            />
          </Flex>

          {hasNoQuery ? (
            isLoadingFollowers ? (
              <Flex
                justifyContent='center'
                alignItems='center'
                style={{ flexGrow: 1 }}
              >
                <LoadingSpinner
                  style={{ height: 60, width: 60, marginBottom: 80 }}
                />
              </Flex>
            ) : filteredFollowerUsers && filteredFollowerUsers.length > 0 ? (
              <KeyboardAwareFlatList
                data={filteredFollowerUsers}
                renderItem={({ item }) => (
                  <UserItem user={item} onSelect={handleSelectUser} />
                )}
                keyExtractor={(user: User) => user.user_id.toString()}
                contentContainerStyle={{ minHeight: '100%', flexGrow: 1 }}
                keyboardShouldPersistTaps='always'
                ListFooterComponent={<View style={{ height: 120 }} />}
              />
            ) : null
          ) : isLoading ? (
            <Flex
              justifyContent='center'
              alignItems='center'
              style={{ flexGrow: 1 }}
            >
              <LoadingSpinner
                style={{ height: 60, width: 60, marginBottom: 80 }}
              />
            </Flex>
          ) : (
            <KeyboardAwareFlatList
              onEndReached={handleLoadMore}
              data={filteredUsers}
              renderItem={({ item }) => (
                <UserItem user={item} onSelect={handleSelectUser} />
              )}
              keyExtractor={(user: User) => user.user_id.toString()}
              contentContainerStyle={{ minHeight: '100%', flexGrow: 1 }}
              ListEmptyComponent={null}
              keyboardShouldPersistTaps='always'
              ListFooterComponent={
                <View style={{ height: hasNextPage ? 120 : 0 }} />
              }
            />
          )}
        </Flex>
      </ScreenContent>
    </Screen>
  )
}
