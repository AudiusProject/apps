import { useCallback, useEffect, useState } from 'react'

import { useCurrentUserId, useUsers } from '@audius/common/api'
import {
  Status,
  statusIsNotFinalized,
  SquareSizes,
  User
} from '@audius/common/models'
import {
  searchUsersModalActions,
  searchUsersModalSelectors
} from '@audius/common/store'
import { View, Image, Pressable } from 'react-native'
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view'
import { useDispatch, useSelector } from 'react-redux'
import { useDebounce } from 'react-use'

import { IconSearch } from '@audius/harmony-native'
import MagnifyingGlass from 'app/assets/images/leftPointingMagnifyingGlass.png'
import {
  Screen,
  ScreenContent,
  Text,
  TextInput,
  HeaderShadow
} from 'app/components/core'
import { Avatar, Flex } from '@audius/harmony-native'
import LoadingSpinner from 'app/components/loading-spinner'
import { useRoute } from 'app/hooks/useRoute'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'
import { useProfilePicture } from 'app/components/image/UserImage'
import { UserLink } from 'app/components/user-link/UserLink'
import { userSelectionCallbacks } from 'app/components/send-tokens-drawer/components/UserSearchAutocomplete'

const { searchUsers } = searchUsersModalActions
const { getUserList } = searchUsersModalSelectors

const DEBOUNCE_MS = 150

const messages = {
  title: 'Select Recipient',
  search: ' Search Users',
  emptyTitle: 'Search for Users',
  emptyDescription: 'Search for users by name or handle to send tokens.'
}

const useStyles = makeStyles(({ spacing, palette, typography }) => ({
  rootContainer: {
    backgroundColor: palette.white,
    flexGrow: 1
  },
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1
  },
  loadingSpinner: {
    height: spacing(15),
    width: spacing(15),
    marginBottom: spacing(20)
  },
  searchContainer: {
    marginTop: spacing(8),
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(2)
  },
  searchBorder: {
    borderBottomColor: palette.neutralLight8,
    borderBottomWidth: 1
  },
  searchInputContainer: {
    paddingRight: spacing(5),
    paddingLeft: spacing(4),
    paddingVertical: spacing(6)
  },
  searchInputText: {
    fontFamily: typography.fontByWeight.demiBold,
    fontSize: typography.fontSize.large
  },
  flatListContainer: {
    minHeight: '100%',
    flexGrow: 1
  },
  emptyContainer: {
    marginTop: spacing(6),
    margin: spacing(2),
    padding: spacing(6),
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(6),
    backgroundColor: palette.neutralLight10,
    borderRadius: spacing(2),
    borderColor: palette.background,
    borderWidth: 1
  },
  emptyTextContainer: {
    flexShrink: 1,
    gap: spacing(2)
  },
  magnifyingGlass: {
    height: spacing(16),
    width: spacing(16)
  },
  emptyTitle: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontByWeight.bold,
    lineHeight: typography.fontSize.xxl * 1.3
  },
  emptyDescription: {
    fontSize: typography.fontSize.large,
    lineHeight: typography.fontSize.large * 1.3
  },
  icon: {
    height: spacing(6),
    width: spacing(6)
  },
  footerPadding: {
    height: spacing(30)
  },
  userItem: {
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLight8
  }
}))

const ListEmpty = () => {
  const styles = useStyles()

  return (
    <View style={styles.emptyContainer}>
      <Image source={MagnifyingGlass} style={styles.magnifyingGlass} />
      <View style={styles.emptyTextContainer}>
        <Text style={styles.emptyTitle}>{messages.emptyTitle}</Text>
        <Text style={styles.emptyDescription}>{messages.emptyDescription}</Text>
      </View>
    </View>
  )
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
  }, [loadMore])

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
  const styles = useStyles()
  const profilePicture = useProfilePicture({
    userId: user.user_id,
    size: SquareSizes.SIZE_150_BY_150
  })

  return (
    <Pressable style={styles.userItem} onPress={() => onSelect(user)}>
      <Avatar source={profilePicture.source} />
      <Flex flex={1} style={{ minWidth: 0 }}>
        <UserLink userId={user.user_id} />
        <Text variant='body' size='s' color='subdued' numberOfLines={1}>
          @{user.handle}
        </Text>
      </Flex>
    </Pressable>
  )
}

export const SendTokensUserSelectionScreen = () => {
  const styles = useStyles()
  const [query, setQuery] = useState('')
  const [inputValue, setInputValue] = useState('')
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const { params } = useRoute<'SendTokensUserSelection'>()
  const excludedUserIds = params?.excludedUserIds
  const callbackId = params?.callbackId

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

  const isLoading = statusIsNotFinalized(status) && userIds.length === 0

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
        <View style={styles.rootContainer}>
          <View
            style={[
              styles.searchContainer,
              users?.length ? styles.searchBorder : null
            ]}
          >
            <TextInput
              placeholder={messages.search}
              autoFocus={true}
              Icon={IconSearch}
              styles={{
                root: styles.searchInputContainer,
                input: styles.searchInputText
              }}
              iconProp={styles.icon}
              onChangeText={setInputValue}
              value={inputValue}
              inputAccessoryViewID='none'
              clearable={true}
              onClear={handleClear}
            />
          </View>

          {isLoading ? (
            <View style={styles.spinnerContainer}>
              <LoadingSpinner style={styles.loadingSpinner} />
            </View>
          ) : (
            <KeyboardAwareFlatList
              onEndReached={handleLoadMore}
              data={users}
              renderItem={({ item }) => (
                <UserItem user={item} onSelect={handleSelectUser} />
              )}
              keyExtractor={(user: User) => user.user_id.toString()}
              contentContainerStyle={styles.flatListContainer}
              ListEmptyComponent={query ? null : <ListEmpty />}
              keyboardShouldPersistTaps='always'
              ListFooterComponent={<View style={styles.footerPadding} />}
            />
          )}
        </View>
      </ScreenContent>
    </Screen>
  )
}
