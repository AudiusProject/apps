import { useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useSearchUsersModal,
  useUsers
} from '@audius/common/api'
import { User, UserMetadata } from '@audius/common/models'
import {
  Box,
  Button,
  Flex,
  IconButton,
  IconKebabHorizontal,
  IconPlus,
  IconTrash,
  PopupMenu,
  Text,
  TextInput
} from '@audius/harmony'
import { useField } from 'formik'
import { useDebounce } from 'react-use'

import ArtistChip from 'components/artist/ArtistChip'

const messages = {
  title: 'Add Collaborator to this Track',
  description:
    "If they accept your invite, your track will be shared with their followers, and they'll be credited as an artist.",
  search: 'Search for an artist',
  add: 'Add Collaborator',
  invitePending: 'Invite Pending',
  remove: 'Remove',
  options: (name: string) => `Options for ${name}`
}

const SEARCH_DEBOUNCE_MS = 250
const MAX_RESULTS = 6

type CollaboratorRowProps = {
  user: UserMetadata
  onRemove: () => void
}

// A tagged collaborator: the artist, an overflow menu (remove), and the
// invite-pending status — mirrors the Figma "Add Collaborator" rows.
const CollaboratorRow = ({ user, onRemove }: CollaboratorRowProps) => (
  <Flex alignItems='center' justifyContent='space-between' gap='m' w='100%'>
    <ArtistChip
      userId={user.user_id}
      showPopover={false}
      showFollowsYou={false}
      customChips={<Box />}
    />
    <Flex direction='column' alignItems='flex-end' gap='2xs'>
      <PopupMenu
        items={[
          { text: messages.remove, icon: <IconTrash />, onClick: onRemove }
        ]}
        renderTrigger={(anchorRef, triggerPopup) => (
          <IconButton
            ref={anchorRef}
            icon={IconKebabHorizontal}
            size='s'
            color='subdued'
            aria-label={messages.options(user.name)}
            onClick={() => triggerPopup()}
          />
        )}
      />
      <Text variant='label' size='s' color='subdued'>
        {messages.invitePending}
      </Text>
    </Flex>
  </Flex>
)

type CollaboratorSearchProps = {
  excludedUserIds: number[]
  onSelect: (user: User) => void
}

// Inline artist search with a results list, shown when adding a collaborator.
const CollaboratorSearch = ({
  excludedUserIds,
  onSelect
}: CollaboratorSearchProps) => {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useDebounce(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS, [query])

  const { userIds } = useSearchUsersModal({ query: debouncedQuery })
  const excluded = useMemo(() => new Set(excludedUserIds), [excludedUserIds])
  const ids = useMemo(
    () => userIds.filter((id) => !excluded.has(id)).slice(0, MAX_RESULTS),
    [userIds, excluded]
  )
  const { data: users } = useUsers(ids)

  return (
    <Flex direction='column' gap='s'>
      <TextInput
        label={messages.search}
        value={query}
        autoFocus
        onChange={(e) => setQuery(e.target.value)}
      />
      {users && users.length > 0 ? (
        <Flex
          direction='column'
          border='default'
          borderRadius='m'
          css={{ overflow: 'hidden' }}
        >
          {users.map((user) => (
            <Box
              key={user.user_id}
              pv='s'
              ph='m'
              css={{ cursor: 'pointer' }}
              onClick={() => onSelect(user)}
            >
              <ArtistChip
                userId={user.user_id}
                showPopover={false}
                showFollowsYou={false}
                customChips={<Box />}
              />
            </Box>
          ))}
        </Flex>
      ) : null}
    </Flex>
  )
}

// Body of the Collaborators ContextualMenu modal.
export const CollaboratorsMenuFields = () => {
  const [{ value }, , { setValue }] = useField<UserMetadata[]>('collaborators')
  const collaborators = useMemo(() => value ?? [], [value])
  const { data: currentUserId } = useCurrentUserId()
  const [isSearching, setIsSearching] = useState(collaborators.length === 0)

  const excludedUserIds = useMemo(() => {
    const ids = collaborators.map((collaborator) => collaborator.user_id)
    if (currentUserId) ids.push(currentUserId)
    return ids
  }, [collaborators, currentUserId])

  const handleAdd = (user: User) => {
    setValue([...collaborators, user])
    setIsSearching(false)
  }

  const handleRemove = (userId: number) => {
    setValue(
      collaborators.filter((collaborator) => collaborator.user_id !== userId)
    )
  }

  return (
    <Flex direction='column' gap='l'>
      <Flex direction='column' gap='xs'>
        <Text variant='title' size='l'>
          {messages.title}
        </Text>
        <Text variant='body' size='s' color='subdued'>
          {messages.description}
        </Text>
      </Flex>

      {collaborators.length > 0 ? (
        <Flex direction='column' gap='m'>
          {collaborators.map((collaborator) => (
            <CollaboratorRow
              key={collaborator.user_id}
              user={collaborator}
              onRemove={() => handleRemove(collaborator.user_id)}
            />
          ))}
        </Flex>
      ) : null}

      {isSearching ? (
        <CollaboratorSearch
          excludedUserIds={excludedUserIds}
          onSelect={handleAdd}
        />
      ) : (
        <Button
          variant='secondary'
          fullWidth
          iconLeft={IconPlus}
          onClick={() => setIsSearching(true)}
        >
          {messages.add}
        </Button>
      )}
    </Flex>
  )
}
