import { useCurrentAccountUser } from '@audius/common/api'
import { imageProfilePicEmpty } from '@audius/common/assets'
import { Name, SquareSizes } from '@audius/common/models'
import {
  Avatar,
  Box,
  Flex,
  IconArrowLeft,
  IconButton,
  IconCamera,
  IconVerified,
  PlainButton,
  Text,
  useTheme
} from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router'

import { make } from 'common/store/analytics/actions'
import {
  getHandleField,
  getIsVerified,
  getNameField,
  getProfileImageField
} from 'common/store/pages/signon/selectors'
import { useMedia } from 'hooks/useMedia'
import { useProfilePicture } from 'hooks/useProfilePicture'
import { useSelector } from 'utils/reducer'

import { CoverPhotoBanner } from './CoverPhotoBanner'
import { ImageField, ImageFieldValue } from './ImageField'

type AccountHeaderProps = {
  backButtonText?: string
  mode: 'editing' | 'viewing'
  size?: 'small' | 'large'
  formDisplayName?: string
  formProfileImage?: ImageFieldValue
  onProfileImageChange?: (value: ImageFieldValue) => void
  onCoverPhotoChange?: (value: ImageFieldValue) => void
  // If true, the banner will be rendered as a paper header
  isPaperHeader?: boolean
}

const ProfileImageAvatar = ({
  imageUrl,
  isEditing,
  size
}: {
  imageUrl?: string
  isEditing?: boolean
  size?: 'small' | 'large'
}) => {
  const { isMobile } = useMedia()
  const isSmallSize = isEditing || isMobile || size === 'small'

  return (
    <Avatar
      variant='strong'
      src={imageUrl}
      size={isSmallSize ? 'large' : 'xxl'}
      css={{
        ...(isEditing && { cursor: 'pointer' }),
        ...(isSmallSize ? { transform: 'translateY(20px)' } : null)
      }}
      isLoading={false}
    >
      {isEditing && (!imageUrl || imageUrl === imageProfilePicEmpty) ? (
        <IconButton
          aria-label='Upload a profile photo'
          size='l'
          color='white'
          shadow='drop'
          icon={IconCamera}
        />
      ) : null}
    </Avatar>
  )
}

export const AccountHeader = (props: AccountHeaderProps) => {
  const {
    backButtonText,
    mode,
    formDisplayName,
    formProfileImage,
    onProfileImageChange,
    onCoverPhotoChange,
    size,
    isPaperHeader
  } = props
  const dispatch = useDispatch()
  const profileImageField = useSelector(getProfileImageField)
  const { value: displayNameField } = useSelector(getNameField)
  const { value: handleField } = useSelector(getHandleField)
  const isVerified = useSelector(getIsVerified)
  const { data: accountData } = useCurrentAccountUser({
    select: (user) => ({
      accountHandle: user?.handle,
      userId: user?.user_id,
      accountDisplayName: user?.name
    })
  })
  const { accountHandle, userId, accountDisplayName } = accountData ?? {}
  const accountProfilePic = useProfilePicture({
    userId: userId ?? undefined,
    size: SquareSizes.SIZE_150_BY_150
  })

  const isEditing = mode === 'editing'
  const { spacing } = useTheme()
  const navigate = useNavigate()

  const displayName = formDisplayName || displayNameField || accountDisplayName
  const handle = handleField || accountHandle

  const { isMobile } = useMedia()
  const isSmallSize = isEditing || isMobile || size === 'small'

  const savedProfileImage =
    profileImageField?.url || accountProfilePic || imageProfilePicEmpty

  return (
    <Box w='100%'>
      {backButtonText ? (
        <Box
          css={{
            position: 'absolute',
            top: spacing.xl,
            left: spacing.xl,
            zIndex: 2
          }}
        >
          <PlainButton
            iconLeft={IconArrowLeft}
            variant='inverted'
            onClick={() => navigate(-1)}
          >
            {backButtonText}
          </PlainButton>
        </Box>
      ) : null}
      <Box h={isSmallSize ? 96 : 168} css={{ overflow: 'hidden' }} w='100%'>
        {isEditing ? (
          <ImageField
            onChange={onCoverPhotoChange}
            onError={(error) => {
              dispatch(
                make(Name.CREATE_ACCOUNT_UPLOAD_COVER_PHOTO_ERROR, { error })
              )
            }}
            name='coverPhoto'
            imageResizeOptions={{ square: false }}
          >
            {(uploadedImage) => (
              <CoverPhotoBanner
                coverPhotoUrl={uploadedImage?.url}
                profileImageUrl={formProfileImage?.url}
                isEditing
                isPaperHeader={isPaperHeader}
              />
            )}
          </ImageField>
        ) : (
          <CoverPhotoBanner isPaperHeader={isPaperHeader} />
        )}
      </Box>
      <Flex
        css={[
          {
            position: 'absolute',
            display: 'flex'
          },
          isSmallSize
            ? { bottom: 0, left: 16, maxWidth: 'calc(100% - 32px)' }
            : {
                left: 0,
                maxWidth: '100%',
                right: 0,
                top: 80,
                margin: '0 auto'
              }
        ]}
        justifyContent={isSmallSize ? 'flex-start' : 'center'}
        alignItems={isSmallSize ? 'flex-end' : 'flex-start'}
        gap={isSmallSize ? 's' : 'xl'}
      >
        {isEditing ? (
          <ImageField
            onChange={onProfileImageChange}
            name='profileImage'
            css={{ flex: 0 }}
            onError={(error) => {
              dispatch(
                make(Name.CREATE_ACCOUNT_UPLOAD_PROFILE_PHOTO_ERROR, { error })
              )
            }}
          >
            {(uploadedImage) => (
              <ProfileImageAvatar
                imageUrl={uploadedImage?.url ?? savedProfileImage}
                isEditing
                size={size}
              />
            )}
          </ImageField>
        ) : (
          <ProfileImageAvatar imageUrl={savedProfileImage} size={size} />
        )}
        <Flex
          direction='column'
          gap='2xs'
          alignItems='flex-start'
          css={{
            textAlign: 'left'
          }}
          mb='s'
        >
          <Text
            variant='heading'
            size={isSmallSize ? 's' : 'xl'}
            strength='strong'
            color='white'
            shadow='emphasis'
            tag='p'
            css={{
              wordBreak: 'break-word',
              minHeight: isSmallSize ? '24px' : '40px',
              minWidth: '1px'
            }}
          >
            {displayName}
          </Text>
          <Flex gap='s' alignItems='center'>
            <Text
              variant='title'
              size={isSmallSize ? 'm' : 'l'}
              color='white'
              shadow='emphasis'
            >
              @{handle}
            </Text>
            {isVerified ? <IconVerified size='s' /> : null}
          </Flex>
        </Flex>
      </Flex>
    </Box>
  )
}
