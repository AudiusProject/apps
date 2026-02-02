import { useCallback, useEffect, useState } from 'react'

import { useCurrentUserId, useUsers, useFollowers } from '@audius/common/api'
import type { User } from '@audius/common/models'
import {
  Status,
  statusIsNotFinalized,
  SquareSizes
} from '@audius/common/models'
import {
  searchUsersModalActions,
  searchUsersModalSelectors,
  useSendTokensModal
} from '@audius/common/store'
import { useFocusEffect } from '@react-navigation/native'
import { Pressable, View } from 'react-native'
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view'
import { useDispatch, useSelector } from 'react-redux'
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

const { searchUsers } = searchUsersModalActions
const { getUserList } = searchUsersModalSelectors

const DEBOUNCE_MS = 150

const messages = {
  title: 'Select Recipient',
  search: ' Search Users'
}

const useQueryUserList = (query: string, excludedUserIds?: number[]) => {
  const dispatch = useDispatch()
  const { userIds, status, hasMore } = useSelector(getUserList)

  const loadMore = useCallback(() => {
    dispatch(searchUsers({ query }))
  }, [query, dispatch])

  useEffect(() => {
    if (query.trim()) {
      loadMore()
    }
  }, [loadMore, query])

  const filteredUserIds = excludedUserIds
    ? userIds.filter((id) => !excludedUserIds.includes(id))
    : userIds

  return { hasMore, loadMore, status, userIds: filteredUserIds }
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
  const [query, setQuery] = useState('')
  const [inputValue, setInputValue] = useState('')
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const { params } = useRoute<'SendTokensUserSelection'>()
  const excludedUserIds = params?.excludedUserIds
  const callbackId = params?.callbackId
  const { onOpen: openSendTokensDrawer } = useSendTokensModal()

  // Reopen the send drawer when navigating back from this screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        // This runs when the screen loses focus (user navigates back)
        // If callback still exists, user navigated back without selecting
        // If callback doesn't exist, user selected someone (callback was deleted in handleSelectUser)
        if (callbackId && userSelectionCallbacks.has(callbackId)) {
          // Clean up the callback
          userSelectionCallbacks.delete(callbackId)
          // Reopen the send drawer since user navigated back without selecting
          setTimeout(() => {
            openSendTokensDrawer()
          }, 100)
        }
      }
    }, [callbackId, openSendTokensDrawer])
  )

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

  const queryUserList = useQueryUserList(query, excludedUserIds)

  const { hasMore, loadMore, status, userIds } = queryUserList

  const { data: users } = useUsers(userIds.length > 0 ? userIds : null)

  useDebounce(
    () => {
      setQuery(inputValue)
    },
    DEBOUNCE_MS,
    [inputValue, setQuery, dispatch]
  )

  const handleClear = useCallback(() => {
    setInputValue('')
    setQuery('')
  }, [setQuery])

  const handleLoadMore = useCallback(() => {
    if (status !== Status.LOADING && hasMore) {
      loadMore?.()
    }
  }, [status, loadMore, hasMore])

  const handleSelectUser = useCallback(
    (user: User) => {
      if (callbackId) {
        const callback = userSelectionCallbacks.get(callbackId)
        if (callback) {
          callback(user)
        }
        // Clean up the callback
        userSelectionCallbacks.delete(callbackId)
      }
      navigation.goBack()
    },
    [callbackId, navigation]
  )

  const isLoading =
    statusIsNotFinalized(status) &&
    userIds.length === 0 &&
    query.trim().length > 0
  const hasNoQuery = !query.trim()

  return (
    <Screen
      url='/send-tokens-user-selection'
      title={messages.title}
      icon={IconSearch}
      variant='secondary'
      topbarRight={null}
    >
      <ScreenContent>
        <HeaderShadow />
        <Flex style={{ flexGrow: 1 }} backgroundColor='white'>
          <Flex mt='xl' ph='xs' pb='xs'>
            {users && users.length > 0 && <Divider />}
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
              data={users}
              renderItem={({ item }) => (
                <UserItem user={item} onSelect={handleSelectUser} />
              )}
              keyExtractor={(user: User) => user.user_id.toString()}
              contentContainerStyle={{ minHeight: '100%', flexGrow: 1 }}
              ListEmptyComponent={null}
              keyboardShouldPersistTaps='always'
              ListFooterComponent={<View style={{ height: 120 }} />}
            />
          )}
        </Flex>
      </ScreenContent>
    </Screen>
  )
}
