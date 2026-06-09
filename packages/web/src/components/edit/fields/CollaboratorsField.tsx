import { useCallback, useMemo, useState } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { User, UserMetadata } from '@audius/common/models'
import {
  Box,
  Button,
  Flex,
  IconButton,
  IconClose,
  Text,
  useTheme
} from '@audius/harmony'
import { useField } from 'formik'

import ArtistChip from 'components/artist/ArtistChip'
import { SearchUsersModal } from 'components/search-users-modal/SearchUsersModal'

const messages = {
  label: 'Collaborators',
  description:
    'Tag other artists as collaborators. Each is invited to accept; once they do, the track also appears on their profile.',
  add: 'Add Collaborator',
  modalTitle: 'Add Collaborators',
  remove: (name: string) => `Remove ${name}`
}

type CollaboratorsFieldProps = {
  name: string
}

/**
 * Track-upload field for tagging collaborator artists, modeled on the
 * invite-manager search UI. Stores the selected users on the form; the upload
 * adapter maps them to numeric ids for the on-chain metadata.
 */
export const CollaboratorsField = ({ name }: CollaboratorsFieldProps) => {
  const { color } = useTheme()
  const [{ value }, , { setValue }] = useField<UserMetadata[] | undefined>(name)
  const collaborators = useMemo(() => value ?? [], [value])
  const [isOpen, setIsOpen] = useState(false)
  const { data: currentUserId } = useCurrentUserId()

  const excludedUserIds = useMemo(() => {
    const ids = collaborators.map((collaborator) => collaborator.user_id)
    if (currentUserId) ids.push(currentUserId)
    return ids
  }, [collaborators, currentUserId])

  const handleAdd = useCallback(
    (user: User) => {
      setValue([...collaborators, user])
      setIsOpen(false)
    },
    [collaborators, setValue]
  )

  const handleRemove = useCallback(
    (userId: number) => {
      setValue(
        collaborators.filter((collaborator) => collaborator.user_id !== userId)
      )
    },
    [collaborators, setValue]
  )

  const renderUser = useCallback(
    (user: User) => (
      <Box
        key={user.user_id}
        pv='l'
        borderTop='default'
        ph='xl'
        css={{
          '&:hover': {
            cursor: 'pointer',
            backgroundColor: color.background.surface1
          }
        }}
      >
        <ArtistChip
          userId={user.user_id}
          showPopover={false}
          onClickArtistName={() => handleAdd(user)}
        />
      </Box>
    ),
    [handleAdd, color]
  )

  return (
    <Flex direction='column' gap='m'>
      <Flex direction='column' gap='xs'>
        <Text variant='title' size='l'>
          {messages.label}
        </Text>
        <Text variant='body' size='s' color='subdued'>
          {messages.description}
        </Text>
      </Flex>
      {collaborators.length > 0 ? (
        <Flex gap='s' wrap='wrap'>
          {collaborators.map((collaborator) => (
            <Flex
              key={collaborator.user_id}
              alignItems='center'
              gap='xs'
              pl='s'
              pr='xs'
              pv='2xs'
              border='strong'
              borderRadius='m'
            >
              <Text variant='body' size='s'>
                {collaborator.name}
              </Text>
              <IconButton
                icon={IconClose}
                size='xs'
                color='subdued'
                aria-label={messages.remove(collaborator.name)}
                onClick={() => handleRemove(collaborator.user_id)}
              />
            </Flex>
          ))}
        </Flex>
      ) : null}
      <Button
        variant='secondary'
        size='small'
        onClick={() => setIsOpen(true)}
        css={{ alignSelf: 'flex-start' }}
      >
        {messages.add}
      </Button>
      <SearchUsersModal
        titleProps={{ title: messages.modalTitle }}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        excludedUserIds={excludedUserIds}
        renderUser={renderUser}
      />
    </Flex>
  )
}
