import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { useUsers } from '@audius/common/api'
import { User, Status } from '@audius/common/models'
import {
  searchUsersModalActions,
  searchUsersModalSelectors
} from '@audius/common/store'
import {
  Flex,
  IconButton,
  IconClose,
  IconSearch,
  Menu,
  MenuContent,
  MenuItem,
  Text,
  TextInput,
  OptionKeyHandler,
  LoadingSpinner
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { useDebounce } from 'react-use'

import { Avatar } from 'components/avatar'
import { UserLink } from 'components/link'

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
  const dispatch = useDispatch()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [hasQuery, setHasQuery] = useState(false)
  const [menuWidth, setMenuWidth] = useState<number | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<HTMLButtonElement[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

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
        dispatch(searchUsers({ query: query.trim(), limit: 3 }))
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
      if (anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect()
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
    (userId: string) => {
      const user = filteredUsers.find((u) => u.user_id === Number(userId))
      if (user) {
        onChange(user)
        // Keep the formatted string in query as a fallback until value prop is updated
        setQuery(`${user.name} (@${user.handle})`)
        setIsOpen(false)
      }
    },
    [filteredUsers, onChange]
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

  const options = useMemo(
    () =>
      filteredUsers.map((user) => ({
        value: String(user.user_id)
      })),
    [filteredUsers]
  )

  const renderContent = () => {
    if (isLoading) {
      return (
        <Flex justifyContent='center' alignItems='center' p='m' w='100%'>
          <LoadingSpinner css={{ height: 32 }} />
        </Flex>
      )
    }

    if (!filteredUsers || filteredUsers.length === 0) {
      return <Text>{messages.noUsersFound}</Text>
    }

    return (
      <OptionKeyHandler
        options={options}
        optionRefs={optionRefs}
        scrollRef={scrollRef}
        onChange={handleSelectUser}
        initialActiveIndex={0}
      >
        {(activeValue) =>
          options.map((option, index) => {
            const { value } = option
            const userId = Number(value)
            const user = filteredUsers.find((u) => u.user_id === userId)
            if (!user) return null
            const isActive =
              !activeValue ? index === 0 : activeValue === value
            return (
              <MenuItem
                variant='option'
                value={value}
                onChange={handleSelectUser}
                onClick={(e) => {
                  // Ensure selection happens on click
                  e.stopPropagation()
                  handleSelectUser(value)
                }}
                ref={(el) => {
                  if (optionRefs && optionRefs.current && el) {
                    optionRefs.current[index] = el
                  }
                }}
                styles={{
                  button: { paddingLeft: 8, paddingRight: 8, height: 52 }
                }}
                key={userId}
                leadingElement={<Avatar userId={userId} h={32} w={32} />}
                isActive={isActive}
                label={
                  <Flex column alignItems='flex-start'>
                    <UserLink
                      userId={userId}
                      size='s'
                      disabled
                      variant={isActive ? 'inverted' : 'default'}
                    />
                    <Text size='xs' color={isActive ? 'white' : 'subdued'}>
                      {user.handle}
                    </Text>
                  </Flex>
                }
              />
            )
          })
        }
      </OptionKeyHandler>
    )
  }

  return (
    <div ref={containerRef} css={{ position: 'relative', width: '100%' }}>
      <div ref={anchorRef} css={{ width: '100%' }}>
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
      </div>
      <Menu anchorRef={anchorRef} isVisible={isOpen && !!query.trim()} onClose={() => setIsOpen(false)}>
        <MenuContent
          scrollRef={scrollRef}
          width={menuWidth ? `${menuWidth}px` : undefined}
          minWidth={menuWidth ? `${menuWidth}px` : 180}
          aria-label='User search results'
        >
          {renderContent()}
        </MenuContent>
      </Menu>
    </div>
  )
}

