import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { useSearchUsersModal } from '@audius/common/api'
import { User } from '@audius/common/models'
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
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [menuWidth, setMenuWidth] = useState<number | undefined>(undefined)
  const [shouldPositionAbove, setShouldPositionAbove] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<HTMLButtonElement[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const trimmedQuery = debouncedQuery.trim()
  const hasQuery = trimmedQuery.length > 0

  const { users, isPending } = useSearchUsersModal({
    query: trimmedQuery,
    limit: 3
  })

  const filteredUsers = useMemo(() => {
    if (!users) return []
    const excludedUserIdsSet = new Set(excludedUserIds ?? [])
    return users.filter((u) => !excludedUserIdsSet.has(u.user_id))
  }, [users, excludedUserIds])

  useDebounce(
    () => {
      setDebouncedQuery(query)
    },
    DEBOUNCE_MS,
    [query]
  )

  // Calculate menu width to match input and check if we should position above
  useEffect(() => {
    const updateWidthAndPosition = () => {
      if (anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect()
        setMenuWidth(rect.width)

        // Estimate menu height (approximately 52px per item + padding)
        // We'll use a conservative estimate of 3 items max based on the search limit
        const estimatedMenuHeight = 3 * 52 + 32 // 3 items + padding
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top

        // Position above if there's not enough space below but there is space above
        if (
          spaceBelow < estimatedMenuHeight &&
          spaceAbove > estimatedMenuHeight
        ) {
          setShouldPositionAbove(true)
        } else {
          setShouldPositionAbove(false)
        }
      }
    }

    if (isOpen && query.trim()) {
      // Calculate immediately and after a brief delay to ensure input is rendered
      updateWidthAndPosition()
      const timeoutId = setTimeout(updateWidthAndPosition, 0)

      window.addEventListener('resize', updateWidthAndPosition)
      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('resize', updateWidthAndPosition)
      }
    }
  }, [isOpen, query])

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

  const isLoading = isPending && hasQuery

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
            const isActive = !activeValue ? index === 0 : activeValue === value
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
      <Menu
        anchorRef={anchorRef}
        isVisible={isOpen && !!query.trim()}
        onClose={() => setIsOpen(false)}
        anchorOrigin={{
          horizontal: 'center',
          vertical: shouldPositionAbove ? 'top' : 'bottom'
        }}
        transformOrigin={{
          horizontal: 'center',
          vertical: shouldPositionAbove ? 'bottom' : 'top'
        }}
        PaperProps={
          shouldPositionAbove
            ? {
                mt: 0,
                mb: 's'
              }
            : undefined
        }
      >
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
