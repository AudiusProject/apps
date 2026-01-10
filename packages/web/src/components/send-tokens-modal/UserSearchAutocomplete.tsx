import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  MouseEvent
} from 'react'

import { useUsers } from '@audius/common/api'
import { User, Status, SquareSizes } from '@audius/common/models'
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
  Menu,
  Scrollbar,
  Text,
  TextInput,
  useTheme,
  Avatar
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { useDebounce } from 'react-use'

import { UserLink } from 'components/link/UserLink'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { useProfilePicture } from 'hooks/useProfilePicture'

const messages = {
  searchUsers: 'Search Users',
  clearSearch: 'Clear search',
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
  const { color, cornerRadius, shadows } = useTheme()
  const dispatch = useDispatch()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [hasQuery, setHasQuery] = useState(false)
  const [menuWidth, setMenuWidth] = useState<number | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const { userIds, status } = useSelector(getUserList)
  const lastSearchQuery = useSelector(getLastSearchQuery)

  const ids = useMemo(() => {
    const excludedUserIdsSet = new Set(excludedUserIds ?? [])
    return userIds.filter((id) => !excludedUserIdsSet.has(id))
  }, [userIds, excludedUserIds])

  const { data: users } = useUsers(ids.length > 0 ? ids : null)

  // The search API already filters users by name and handle, so we just use the results directly
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

  // Calculate menu width to match input
  useEffect(() => {
    const updateWidth = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect()
        setMenuWidth(rect.width)
      }
    }

    if (isOpen && query.trim()) {
      // Calculate immediately and after a brief delay to ensure input is rendered
      updateWidth()
      const timeoutId = setTimeout(updateWidth, 0)

      window.addEventListener('resize', updateWidth)
      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('resize', updateWidth)
      }
    }
  }, [isOpen, query])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      // Check if click is outside the container
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Clear query if search state resets
  useEffect(() => {
    if (!lastSearchQuery && hasQuery) {
      setQuery('')
      setHasQuery(false)
    }
  }, [lastSearchQuery, hasQuery])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value
      setQuery(newQuery)
      setIsOpen(true)
      // Clear the selected value when user starts typing a different value
      if (value) {
        const currentDisplayValue = `${value.name} (@${value.handle})`
        if (newQuery !== currentDisplayValue) {
          onChange(null)
        }
      }
    },
    [value, onChange]
  )

  const handleSelectUser = useCallback(
    (user: User) => {
      onChange(user)
      // Keep the formatted string in query as a fallback until value prop is updated
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

  return (
    <Box ref={containerRef} css={{ position: 'relative', width: '100%' }}>
      <Box ref={wrapperRef} css={{ width: '100%' }}>
        <TextInput
          ref={inputRef}
          label={messages.searchUsers}
          value={displayValue}
          onChange={handleChange}
          onFocus={() => {
            // Only open dropdown if there's no selected user or if user starts typing
            if (!value || query.trim()) {
              setIsOpen(true)
            }
          }}
          error={error}
          helperText={helperText}
          placeholder='Search by name or handle'
          endAdornment={
            <IconButton
              icon={value || query ? IconClose : IconSearch}
              css={{ pointerEvents: value || query ? 'auto' : 'none' }}
              color='subdued'
              size='m'
              aria-label={messages.clearSearch}
              onClick={handleClear}
            />
          }
        />
      </Box>

      <Menu
        isVisible={isOpen && !!query.trim()}
        anchorRef={wrapperRef}
        disableAutoFlip
        PaperProps={{ mt: 'none' }}
        css={{
          border: `1px solid ${color.border.default}`,
          borderRadius: cornerRadius.m,
          boxShadow: shadows.emphasis,
          backgroundColor: color.background.surface1,
          maxHeight: '300px',
          overflow: 'hidden',
          padding: 0,
          '& > div': {
            // Target the Paper component inside Menu
            width: menuWidth ? `${menuWidth}px` : '100%',
            minWidth: menuWidth ? `${menuWidth}px` : 'auto',
            padding: 0
          }
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left'
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
      >
        <Scrollbar css={{ maxHeight: '300px', width: '100%' }}>
          {isLoading ? (
            <Flex p='l' alignItems='center' justifyContent='center' gap='m'>
              <LoadingSpinner />
              <Text variant='body' size='s' color='subdued'>
                Searching...
              </Text>
            </Flex>
          ) : filteredUsers.length > 0 ? (
            <Box css={{ width: '100%', padding: 0 }}>
              {filteredUsers.map((user) => (
                <UserOption
                  key={user.user_id}
                  user={user}
                  onSelect={handleSelectUser}
                  isSelected={value?.user_id === user.user_id}
                />
              ))}
            </Box>
          ) : query.trim() ? (
            <Box p='l'>
              <Text variant='body' size='s' color='subdued'>
                {messages.noUsersFound}
              </Text>
            </Box>
          ) : null}
        </Scrollbar>
      </Menu>
    </Box>
  )
}

type UserOptionProps = {
  user: User
  onSelect: (user: User) => void
  isSelected?: boolean
}

const UserOption = ({ user, onSelect, isSelected }: UserOptionProps) => {
  const { color } = useTheme()
  const profilePicture = useProfilePicture({
    userId: user.user_id,
    size: SquareSizes.SIZE_150_BY_150
  })

  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      onSelect(user)
    },
    [user, onSelect]
  )

  return (
    <Flex
      alignItems='center'
      gap='s'
      p='s'
      css={{
        cursor: 'pointer',
        backgroundColor: isSelected ? color.background.surface2 : 'transparent',
        width: '100%',
        minWidth: 0,
        '&:hover': {
          backgroundColor: color.background.surface2
        }
      }}
      onMouseDown={handleMouseDown}
    >
      <Avatar
        h={32}
        w={32}
        src={profilePicture}
        borderWidth='thin'
        css={{ flexShrink: 0 }}
      />
      <Flex direction='column' flex={1} css={{ minWidth: 0, width: 0 }}>
        <Flex alignItems='center' gap='xs' css={{ minWidth: 0, width: '100%' }}>
          <Box
            css={{
              pointerEvents: 'none',
              minWidth: 0,
              flex: 1,
              overflow: 'hidden'
            }}
          >
            <UserLink userId={user.user_id} disabled size='s' />
          </Box>
        </Flex>
        <Text
          variant='body'
          size='xs'
          color='subdued'
          ellipses
          css={{ minWidth: 0, width: '100%' }}
        >
          @{user.handle}
        </Text>
      </Flex>
    </Flex>
  )
}
