import { useCallback, useMemo, useState } from 'react'

import { useCurrentUserId, useSearchUserResults } from '@audius/common/api'
import type { User, UserMetadata } from '@audius/common/models'
import { useField } from 'formik'
import { Pressable } from 'react-native'
import { useDebounce } from 'react-use'

import { Flex, IconClose, IconSearch, Text } from '@audius/harmony-native'
import { TextInput } from 'app/components/core'

const DEBOUNCE_MS = 300
const name = 'collaborators'

const messages = {
  label: 'Collaborators',
  description:
    'Tag other artists as collaborators. Each is invited to accept; once they do, the track also appears on their profile.',
  search: 'Search Users'
}

/**
 * Mobile track-upload field for tagging collaborator artists. Self-contained
 * inline search + removable chips; the upload adapter maps the selected users
 * to numeric ids for the on-chain metadata.
 */
export const CollaboratorField = () => {
  const [{ value }, , { setValue }] = useField<UserMetadata[] | undefined>(name)
  const collaborators = useMemo(() => value ?? [], [value])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useDebounce(() => setDebouncedQuery(query), DEBOUNCE_MS, [query])

  const { data: currentUserId } = useCurrentUserId()
  const { data: results } = useSearchUserResults(
    { query: debouncedQuery.trim(), pageSize: 8 },
    { enabled: debouncedQuery.trim().length > 0 }
  )

  const selectedIds = new Set(collaborators.map((c) => c.user_id))
  const filteredResults = (results ?? []).filter(
    (user) => user.user_id !== currentUserId && !selectedIds.has(user.user_id)
  )

  const handleAdd = useCallback(
    (user: User) => {
      setValue([...collaborators, user])
      setQuery('')
      setDebouncedQuery('')
    },
    [collaborators, setValue]
  )

  const handleRemove = useCallback(
    (userId: number) => {
      setValue(collaborators.filter((c) => c.user_id !== userId))
    },
    [collaborators, setValue]
  )

  return (
    <Flex gap='m' ph='l' pv='l'>
      <Flex gap='xs'>
        <Text variant='title' size='l'>
          {messages.label}
        </Text>
        <Text variant='body' size='s' color='subdued'>
          {messages.description}
        </Text>
      </Flex>
      {collaborators.length > 0 ? (
        <Flex row gap='s' style={{ flexWrap: 'wrap' }}>
          {collaborators.map((collaborator) => (
            <Flex
              key={collaborator.user_id}
              row
              alignItems='center'
              gap='xs'
              ph='s'
              pv='2xs'
              border='strong'
              borderRadius='m'
            >
              <Text variant='body' size='s'>
                {collaborator.name}
              </Text>
              <Pressable
                accessibilityLabel={`Remove ${collaborator.name}`}
                onPress={() => handleRemove(collaborator.user_id)}
              >
                <IconClose size='xs' color='subdued' />
              </Pressable>
            </Flex>
          ))}
        </Flex>
      ) : null}
      <TextInput
        placeholder={messages.search}
        Icon={IconSearch}
        value={query}
        onChangeText={setQuery}
      />
      {filteredResults.length > 0 ? (
        <Flex gap='xs'>
          {filteredResults.map((user) => (
            <Pressable key={user.user_id} onPress={() => handleAdd(user)}>
              <Flex row alignItems='center' gap='s' pv='s'>
                <Text variant='body'>{user.name}</Text>
                <Text variant='body' size='s' color='subdued'>
                  @{user.handle}
                </Text>
              </Flex>
            </Pressable>
          ))}
        </Flex>
      ) : null}
    </Flex>
  )
}
