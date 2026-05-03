import { useCallback, useEffect, useState } from 'react'

import {
  useCurrentUserId,
  useFollowers,
  useSearchUsersModal,
  useUsers
} from '@audius/common/api'
import { Status, statusIsNotFinalized } from '@audius/common/models'
import type { User } from '@audius/common/models'
import { chatActions, chatSelectors } from '@audius/common/store'
import type { CreateChatModalState } from '@audius/common/store'
import { View, Image } from 'react-native'
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view'
import { useDispatch, useSelector } from 'react-redux'
import { useDebounce } from 'react-use'

import { IconCompose, IconSearch } from '@audius/harmony-native'
import MagnifyingGlass from 'app/assets/images/leftPointingMagnifyingGlass.png'
import {
  Screen,
  ScreenContent,
  Text,
  TextInput,
  HeaderShadow
} from 'app/components/core'
import LoadingSpinner from 'app/components/loading-spinner'
import { useRoute } from 'app/hooks/useRoute'
import { makeStyles } from 'app/styles'

import { ChatBlastCTA } from './ChatBlastCTA'
import { ChatUserListItem } from './ChatUserListItem'

const { fetchBlockees, fetchBlockers, fetchPermissions } = chatActions
const { getUserList: getChatsUserList } = chatSelectors

const DEBOUNCE_MS = 150

const messages = {
  title: 'New Message',
  search: ' Search Users',
  emptyTitle: 'Search for Friends',
  emptyDescription:
    'Search for fellow music lovers and strike up a conversation.'
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
  profilePicture: {
    height: spacing(18),
    width: spacing(18)
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
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%'
  },
  footerPadding: {
    height: spacing(30)
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

const useDefaultUserList = (
  defaultUserList: CreateChatModalState['defaultUserList']
) => {
  const { data: currentUserId } = useCurrentUserId()
  const followersQuery = useFollowers(
    { userId: currentUserId },
    { enabled: defaultUserList === 'followers' }
  )
  const chatsUserList = useSelector((state) =>
    getChatsUserList(state, currentUserId)
  )

  const userIds =
    defaultUserList === 'followers'
      ? (followersQuery.users?.map((user) => user.user_id) ?? [])
      : chatsUserList.userIds

  const hasMore =
    defaultUserList === 'followers'
      ? followersQuery.hasNextPage
      : chatsUserList.hasMore

  const loadMore =
    defaultUserList === 'followers' ? followersQuery.fetchNextPage : undefined

  // Emulating Status behavior for consistency below. UserList has a legacy
  // pattern with errorSagas and doesn't use Status directly
  const status =
    defaultUserList === 'followers'
      ? followersQuery.isPending || followersQuery.isFetchingNextPage
        ? Status.LOADING
        : Status.SUCCESS
      : chatsUserList.loading
        ? Status.LOADING
        : Status.SUCCESS

  return {
    hasMore,
    loadMore,
    status,
    userIds
  }
}

const useQueryUserList = (query: string) => {
  const { userIds, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSearchUsersModal({ query })

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Map tan-query state onto the Status enum the UI expects below.
  const status =
    isPending || isFetchingNextPage ? Status.LOADING : Status.SUCCESS

  return { hasMore: !!hasNextPage, loadMore, status, userIds: userIds ?? [] }
}

export const ChatUserListScreen = () => {
  const styles = useStyles()
  const [query, setQuery] = useState('')
  const [inputValue, setInputValue] = useState('')
  const dispatch = useDispatch()
  const { params } = useRoute<'ChatUserList'>()
  const presetMessage = params?.presetMessage
  const defaultUserListType = params?.defaultUserList
  const defaultUserList = useDefaultUserList(defaultUserListType)
  const queryUserList = useQueryUserList(query)

  const hasQuery = query.length > 0

  const { hasMore, loadMore, status, userIds } = hasQuery
    ? queryUserList
    : defaultUserList

  const { data: users } = useUsers(userIds)

  useEffect(() => {
    dispatch(fetchBlockees())
    dispatch(fetchBlockers())
  }, [dispatch])

  useEffect(() => {
    if (userIds.length > 0) {
      dispatch(fetchPermissions({ userIds }))
    }
  }, [dispatch, userIds])

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

  const isLoading = statusIsNotFinalized(status) && userIds.length === 0

  return (
    <Screen
      url='/chat'
      title={messages.title}
      icon={IconCompose}
      variant='secondary'
      topbarRight={null}
    >
      <ScreenContent>
        <HeaderShadow />
        <View style={styles.rootContainer}>
          <View
            style={[
              styles.searchContainer,
              // Only show the border below the search input if
              // there are scrollable users below
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
                <ChatUserListItem
                  userId={item.user_id}
                  presetMessage={presetMessage}
                />
              )}
              keyExtractor={(user: User) => user.handle}
              contentContainerStyle={styles.flatListContainer}
              // Only show empty component if there is no search query
              ListEmptyComponent={query ? null : <ListEmpty />}
              keyboardShouldPersistTaps='always'
              ListFooterComponent={<View style={styles.footerPadding} />}
            />
          )}
        </View>
        <View style={styles.footerContainer}>
          <ChatBlastCTA />
        </View>
      </ScreenContent>
    </Screen>
  )
}
