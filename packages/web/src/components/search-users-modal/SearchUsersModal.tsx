import {
  ChangeEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { useUsers } from '@audius/common/api'
import { ID, Status, User } from '@audius/common/models'
import {
  searchUsersModalActions,
  searchUsersModalSelectors
} from '@audius/common/store'
import {
  Box,
  Flex,
  IconButton,
  IconClose,
  IconSearch,
  Modal,
  ModalHeader,
  ModalProps,
  ModalTitle,
  ModalTitleProps,
  Scrollbar,
  TextInput,
  useTheme
} from '@audius/harmony'
import InfiniteScroll from 'react-infinite-scroller'
import { useDispatch, useSelector } from 'react-redux'
import { useDebounce } from 'react-use'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'

const messages = {
  searchUsers: 'Search Users',
  clearSearch: 'Clear search'
}

const DEBOUNCE_MS = 100

const { searchUsers } = searchUsersModalActions
const { getUserList, getLastSearchQuery } = searchUsersModalSelectors

type UsersSearchProps = {
  debounceMs?: number
  defaultUserList?: {
    userIds: ID[]
    loadMore: () => void
    loading: boolean
    hasMore: boolean
  }
  renderEmpty?: () => ReactNode
  renderUser: (user: User, closeParentModal: () => void) => ReactNode
  excludedUserIds?: number[]
  disableAutofocus?: boolean
  onClose?: () => void
  query: string
  onChange: (query: string) => void
  onFetchResults?: (userIds: ID[]) => void
}

type SearchUsersModalProps = {
  titleProps: ModalTitleProps
  onCancel?: () => void
  footer?: ReactNode
} & Omit<UsersSearchProps, 'query' | 'onChange'> &
  Omit<ModalProps, 'children'>

export const UsersSearch = (props: UsersSearchProps) => {
  const { spacing } = useTheme()
  const {
    debounceMs = DEBOUNCE_MS,
    defaultUserList = {
      userIds: [],
      loading: false,
      loadMore: () => {},
      hasMore: false
    },
    disableAutofocus,
    renderUser,
    renderEmpty = () => null,
    onClose,
    query,
    excludedUserIds,
    onChange,
    onFetchResults
  } = props
  const dispatch = useDispatch()
  const [hasQuery, setHasQuery] = useState(false)
  const scrollParentRef = useRef<HTMLElement | null>(null)

  const { userIds, hasMore, status } = useSelector(getUserList)
  const lastSearchQuery = useSelector(getLastSearchQuery)

  const ids = useMemo(() => {
    const unfilteredIds = hasQuery ? userIds : defaultUserList.userIds
    const excludedUserIdsSet = new Set(excludedUserIds ?? [])
    return unfilteredIds.filter((id) => !excludedUserIdsSet.has(id))
  }, [hasQuery, userIds, defaultUserList.userIds, excludedUserIds])
  const { data: users } = useUsers(ids)

  useEffect(() => {
    onFetchResults?.(ids)
  }, [ids, onFetchResults])

  useDebounce(
    () => {
      dispatch(searchUsers({ query }))
      setHasQuery(!!query)
    },
    debounceMs,
    [query, setHasQuery, dispatch]
  )

  const handleClose = useCallback(() => {
    onClose?.()
  }, [onClose])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  const handleLoadMore = useCallback(() => {
    if (status === Status.LOADING || defaultUserList.loading) {
      return
    }
    if (hasQuery) {
      dispatch(searchUsers({ query }))
    } else {
      defaultUserList.loadMore()
    }
  }, [hasQuery, query, status, defaultUserList, dispatch])

  const getScrollParent = useCallback(() => {
    return scrollParentRef.current
  }, [])

  // Clear the query if something else resets our search state
  useEffect(() => {
    if (!lastSearchQuery) {
      onChange('')
    }
  }, [lastSearchQuery, onChange])
  return (
    <Flex direction='column' h={690}>
      <Box p='xl'>
        <TextInput
          autoFocus={!disableAutofocus}
          label={messages.searchUsers}
          value={query}
          onChange={handleChange}
          endAdornment={
            <IconButton
              icon={query ? IconClose : IconSearch}
              css={{ pointerEvents: query ? 'auto' : 'none' }}
              color='subdued'
              size='m'
              aria-label={messages.clearSearch}
              onClick={() => {
                onChange('')
              }}
            />
          }
        />
      </Box>
      <Scrollbar
        css={{ flex: 1 }}
        containerRef={(containerRef) => {
          scrollParentRef.current = containerRef
        }}
      >
        <InfiniteScroll
          loadMore={handleLoadMore}
          useWindow={false}
          initialLoad
          hasMore={hasQuery ? hasMore : defaultUserList.hasMore}
          getScrollParent={getScrollParent}
          loader={
            <LoadingSpinner
              css={{
                width: spacing.unit12,
                height: spacing.unit12,
                marginBlock: theme.spacing.l,
                marginInline: 'auto'
              }}
            />
          }
          threshold={48}
        >
          {(!hasQuery &&
            !defaultUserList.loading &&
            defaultUserList.userIds.length === 0) ||
          !users?.length
            ? renderEmpty()
            : users.map((user) => renderUser(user, handleClose))}
        </InfiniteScroll>
      </Scrollbar>
    </Flex>
  )
}

export const SearchUsersModal = ({
  titleProps,
  onClosed,
  onClose,
  isOpen,
  footer,
  ...rest
}: SearchUsersModalProps) => {
  const [query, setQuery] = useState('')
  const { onCancel } = rest
  const handleClose = useCallback(() => {
    setQuery('')
    onClose()
  }, [onClose])

  const handleCancel = useCallback(() => {
    handleClose()
    onCancel?.()
  }, [handleClose, onCancel])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      onClosed={onClosed}
      size='small'
    >
      <ModalHeader onClose={handleCancel}>
        <ModalTitle {...titleProps}></ModalTitle>
      </ModalHeader>
      <UsersSearch
        query={query}
        onChange={setQuery}
        onClose={handleClose}
        {...rest}
      />
      {footer ? (
        <Box css={{ position: 'sticky', bottom: 0 }}>{footer}</Box>
      ) : null}
    </Modal>
  )
}
