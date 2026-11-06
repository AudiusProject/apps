import { useCallback, useEffect, useState } from 'react'

import {
  useCurrentUserId,
  useFollowers,
  useSearchUsersModal,
  useUsers
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { Status, statusIsNotFinalized } from '@audius/common/models'
import type { ID, User } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import {
  chatActions,
  chatSelectors,
  MAX_GROUP_CHAT_MEMBERS,
  playbackSelectors
} from '@audius/common/store'
import type { CreateChatModalState } from '@audius/common/store'
import { View, Image, Keyboard } from 'react-native'
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view'
import { useDispatch, useSelector } from 'react-redux'
import { useDebounce } from 'react-use'

import { Box, Button, IconCompose, IconSearch } from '@audius/harmony-native'
import MagnifyingGlass from 'app/assets/images/leftPointingMagnifyingGlass.png'
import {
  Screen,
  ScreenContent,
  Text,
  TextInput,
  HeaderShadow,
  KeyboardAvoidingView
} from 'app/components/core'
import LoadingSpinner from 'app/components/loading-spinner'
import { PLAY_BAR_HEIGHT } from 'app/components/now-playing-drawer/constants'
import { useRoute } from 'app/hooks/useRoute'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'

import { ChatBlastCTA } from './ChatBlastCTA'
import { ChatUserListItem } from './ChatUserListItem'
import { useKeyboardAvoidingPlaybarStyle } from './hooks/useKeyboardAvoidingPlaybarStyle'

const { createChat, fetchBlockees, fetchBlockers, fetchPermissions } =
  chatActions
const { getUserList: getChatsUserList } = chatSelectors
const { getHasTrack } = playbackSelectors

const DEBOUNCE_MS = 150

const MAX_GROUP_CHAT_INVITEES = MAX_GROUP_CHAT_MEMBERS - 1
const GROUP_FOOTER_HEIGHT = 72

const messages = {
  title: 'New Message',
  search: ' Search Users',
  emptyTitle: 'Search for Friends',
  emptyDescription:
    'Search for fellow music lovers and strike up a conversation.',
  startChat: 'Start chat',
  startGroupChat: (count: number) => `Start group chat (${count})`,
  maxMembers: `Group chats can have up to ${MAX_GROUP_CHAT_MEMBERS} people`
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
  },
  groupFooter: {
    backgroundColor: palette.white,
    borderTopColor: palette.neutralLight8,
    borderTopWidth: 1
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

  const { isEnabled: isGroupMessagesEnabled } = useFeatureFlag(
    FeatureFlags.GROUP_MESSAGES
  )
  const { toast } = useToast()
  const hasCurrentlyPlayingTrack = useSelector(getHasTrack)
  const keyboardAvoidingPlaybarStyle = useKeyboardAvoidingPlaybarStyle()
  const [selectedUserIds, setSelectedUserIds] = useState<ID[]>([])
  const isSelectionMode = selectedUserIds.length > 0

  const handleToggleSelect = useCallback(
    (userId: ID) => {
      setSelectedUserIds((prev) => {
        if (prev.includes(userId)) {
          return prev.filter((id) => id !== userId)
        }
        if (prev.length >= MAX_GROUP_CHAT_INVITEES) {
          toast({ content: messages.maxMembers })
          return prev
        }
        return [...prev, userId]
      })
    },
    [toast]
  )

  const handleStartGroupChat = useCallback(() => {
    if (selectedUserIds.length === 0) return
    Keyboard.dismiss()
    dispatch(
      createChat({
        userIds: selectedUserIds,
        presetMessage,
        replaceNavigation: true
      })
    )
  }, [dispatch, presetMessage, selectedUserIds])

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
                  isSelectable={isGroupMessagesEnabled}
                  isSelected={selectedUserIds.includes(item.user_id)}
                  isSelectionMode={isGroupMessagesEnabled && isSelectionMode}
                  onToggleSelect={handleToggleSelect}
                />
              )}
              extraData={selectedUserIds}
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
          {isGroupMessagesEnabled && isSelectionMode ? (
            <KeyboardAvoidingView
              keyboardShowingOffset={
                GROUP_FOOTER_HEIGHT +
                (hasCurrentlyPlayingTrack ? PLAY_BAR_HEIGHT : 0)
              }
              style={keyboardAvoidingPlaybarStyle}
            >
              <Box ph='l' pv='m' style={styles.groupFooter}>
                <Button
                  variant='primary'
                  fullWidth
                  onPress={handleStartGroupChat}
                >
                  {selectedUserIds.length > 1
                    ? messages.startGroupChat(selectedUserIds.length)
                    : messages.startChat}
                </Button>
              </Box>
            </KeyboardAvoidingView>
          ) : (
            <ChatBlastCTA />
          )}
        </View>
      </ScreenContent>
    </Screen>
  )
}
