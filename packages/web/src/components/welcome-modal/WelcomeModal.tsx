import { useCallback, useEffect } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { imageProfilePicEmpty } from '@audius/common/assets'
import { welcomeModalMessages } from '@audius/common/messages'
import { Name, SquareSizes } from '@audius/common/models'
import { fillString, route } from '@audius/common/utils'
import {
  Modal,
  Button,
  Flex,
  IconArrowRight,
  Text,
  IconCloudUpload,
  Avatar,
  Box
} from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router'

import { useModalState } from 'common/hooks/useModalState'
import { make } from 'common/store/analytics/actions'
import {
  getNameField,
  getProfileImageField
} from 'common/store/pages/signon/selectors'
import Drawer from 'components/drawer/Drawer'
import { useMedia } from 'hooks/useMedia'
import { useProfilePicture } from 'hooks/useProfilePicture'
import { CoverPhotoBanner } from 'pages/sign-up-page/components/CoverPhotoBanner'
import { useSelector } from 'utils/reducer'

const { UPLOAD_PAGE } = route

export const WelcomeModal = () => {
  const dispatch = useDispatch()
  const { isMobile } = useMedia()
  const { value: nameField } = useSelector(getNameField)
  const { data: accountData } = useCurrentAccountUser({
    select: (user) => ({ userId: user?.user_id, accountName: user?.name })
  })
  const profileImageField = useSelector(getProfileImageField)
  const { userId, accountName } = accountData ?? {}
  const presavedProfilePic = useProfilePicture({
    userId: userId ?? undefined,
    size: SquareSizes.SIZE_150_BY_150
  })

  const userName = nameField ?? accountName
  const [isOpen, setIsOpen] = useModalState('Welcome')

  const profileImage =
    profileImageField?.url ?? (presavedProfilePic || imageProfilePicEmpty)

  const Root = isMobile ? Drawer : Modal
  const onClose = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  useEffect(() => {
    if (isOpen) {
      dispatch(make(Name.CREATE_ACCOUNT_WELCOME_MODAL, {}))
    }
  }, [dispatch, isOpen])

  return (
    <Root
      isOpen={isOpen}
      onClose={onClose}
      size='small'
      aria-labelledby='welcome-title'
    >
      <Flex w='100%' h={96} css={{ zIndex: 1 }}>
        <CoverPhotoBanner />
      </Flex>
      <Box
        w={96}
        h={96}
        css={{
          position: 'absolute',
          top: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2
        }}
      >
        <Avatar variant='strong' src={profileImage} />
      </Box>
      <Flex
        direction='column'
        p='xl'
        pt='3xl'
        gap='xl'
        css={{ overflow: 'hidden' }}
      >
        <Flex direction='column' css={{ textAlign: 'center' }} gap='l'>
          <Text
            variant='label'
            size='xl'
            strength='strong'
            id='welcome-title'
            color='accent'
          >
            {fillString(
              welcomeModalMessages.welcome,
              userName ? `, ${userName}` : ' '
            )}
          </Text>
          <Text variant='body' size='l'>
            {welcomeModalMessages.youreIn}
          </Text>
        </Flex>
        <Flex direction='column' gap='s'>
          <Button iconRight={IconArrowRight} onClick={onClose}>
            {welcomeModalMessages.startListening}
          </Button>
          <Button
            variant='secondary'
            iconLeft={IconCloudUpload}
            onClick={onClose}
            asChild
          >
            <Link
              to={UPLOAD_PAGE}
              onClick={() => {
                dispatch(
                  make(Name.CREATE_ACCOUNT_WELCOME_MODAL_UPLOAD_TRACK, {})
                )
              }}
            >
              {welcomeModalMessages.upload}
            </Link>
          </Button>
        </Flex>
      </Flex>
    </Root>
  )
}
