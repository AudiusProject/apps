import { useCallback, useRef } from 'react'

import { useMutedUsers } from '@audius/common/api'
import { useMuteUser } from '@audius/common/context'
import { profilePage } from '@audius/common/src/utils/route'
import {
  Flex,
  Text,
  Modal,
  ModalHeader,
  ModalTitle,
  Button,
  IconMessageBlock,
  Scrollbar,
  Divider
} from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { useToggle } from 'react-use'

import { useModalState } from 'common/hooks/useModalState'
import ArtistChip from 'components/artist/ArtistChip'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { MountPlacement } from 'components/types'
import { useIsMobile } from 'hooks/useIsMobile'
import { push as pushRoute } from 'utils/navigation'

const messages = {
  title: 'Comment Settings',
  save: 'Save Changes',
  error: 'Something went wrong. Please try again.',
  description: 'Prevent certain users from commenting on your tracks.',
  unmute: 'Unmute',
  mute: 'Mute',
  noMutedUsers:
    'You haven’t muted any users. Once you do, they will appear here.'
}

const CommentSettingsModal = () => {
  const [isVisible, setIsVisible] = useModalState('CommentSettings')
  const handleClose = useCallback(() => setIsVisible(false), [setIsVisible])
  const scrollParentRef = useRef<HTMLElement | undefined>(undefined)

  const { data: mutedUsers, isPending } = useMutedUsers()
  return (
    <Modal onClose={handleClose} isOpen={isVisible}>
      <ModalHeader onClose={handleClose}>
        <ModalTitle title={messages.title} icon={<IconMessageBlock />} />
      </ModalHeader>
      <Flex direction='column'>
        <Flex ph='xl' pt='xl' mb='l'>
          <Text>{messages.description}</Text>
        </Flex>
        {isPending ? (
          <Flex justifyContent='center' p='xl'>
            <LoadingSpinner />
          </Flex>
        ) : null}

        {mutedUsers && mutedUsers.length === 0 ? (
          <Flex ph='xl' pb='xl'>
            <Text color='subdued'>{messages.noMutedUsers}</Text>
          </Flex>
        ) : null}

        <Scrollbar
          containerRef={(containerRef) => {
            scrollParentRef.current = containerRef
          }}
        >
          {mutedUsers &&
            mutedUsers.map((user) => {
              return (
                <>
                  <Flex
                    key={user.user_id}
                    alignItems='center'
                    direction='row'
                    p='l'
                  >
                    <MutedUser user={user} />
                  </Flex>
                  <Divider orientation='horizontal'></Divider>
                </>
              )
            })}
        </Scrollbar>
      </Flex>
    </Modal>
  )
}

const MutedUser = (props: { user: any }) => {
  const [, setIsVisible] = useModalState('CommentSettings')
  const { user } = props
  const isMobile = useIsMobile()
  const [muteUser] = useMuteUser()
  const dispatch = useDispatch()
  const [isMuted, toggleMuted] = useToggle(true)
  const onClickArtistName = (handle: string) => {
    dispatch(pushRoute(profilePage(handle)))
    setIsVisible(false)
  }

  return (
    <>
      <ArtistChip
        userId={user.user_id}
        onClickArtistName={() => {
          onClickArtistName(user.handle)
        }}
        showPopover={!isMobile}
        popoverMount={MountPlacement.BODY}
        showFollowsYou={false}
      />
      <Button
        size='small'
        variant={isMuted ? 'primary' : 'secondary'}
        onClick={() => {
          muteUser({ mutedUserId: user.user_id, isMuted })
          toggleMuted()
        }}
      >
        {isMuted ? messages.unmute : messages.mute}
      </Button>
    </>
  )
}

export default CommentSettingsModal
