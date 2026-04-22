import { useEventFollowers } from '@audius/common/api'
import { ID } from '@audius/common/models'
import {
  Box,
  Flex,
  IconUser,
  LoadingSpinner,
  Modal,
  ModalHeader,
  ModalTitle,
  Scrollbar,
  Text
} from '@audius/harmony'

import ArtistChip from 'components/artist/ArtistChip'

const messages = {
  title: 'Followers',
  empty: 'No followers yet.'
}

type ContestFollowersModalProps = {
  eventId: ID | null | undefined
  isOpen: boolean
  onClose: () => void
}

/**
 * Minimal modal that surfaces the full follower list for a remix
 * contest event. We're not routing through the shared
 * `UserListModal` infrastructure (which is keyed off Redux slices
 * like follower / favorite / mutual) because events are a different
 * entity type and wiring in a dedicated slice + saga would be a
 * substantially larger change than the Figma calls for here. This
 * modal reads directly from `useEventFollowers` (same hook the
 * avatar pile uses) with a larger limit.
 */
export const ContestFollowersModal = ({
  eventId,
  isOpen,
  onClose
}: ContestFollowersModalProps) => {
  const { userIds, isPending } = useEventFollowers(
    { eventId, limit: 100 },
    { enabled: isOpen }
  )

  const ids = userIds ?? []

  return (
    <Modal isOpen={isOpen} onClose={onClose} css={{ width: 560 }}>
      <ModalHeader>
        <ModalTitle title={messages.title} Icon={IconUser} />
      </ModalHeader>
      <Scrollbar css={{ maxHeight: 560 }}>
        {isPending ? (
          <Flex justifyContent='center' p='xl'>
            <LoadingSpinner />
          </Flex>
        ) : ids.length === 0 ? (
          <Box p='xl'>
            <Text variant='body' color='subdued'>
              {messages.empty}
            </Text>
          </Box>
        ) : (
          <Flex direction='column'>
            {ids.map((userId) => (
              <Box
                key={userId}
                p='l'
                css={(theme) => ({
                  borderBottom: `1px solid ${theme.color.border.default}`,
                  '&:last-child': { borderBottom: 'none' }
                })}
              >
                <ArtistChip userId={userId} showFollowsYou={false} />
              </Box>
            ))}
          </Flex>
        )}
      </Scrollbar>
    </Modal>
  )
}
