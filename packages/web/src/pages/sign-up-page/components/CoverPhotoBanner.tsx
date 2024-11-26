import { SquareSizes, WidthSizes } from '@audius/common/models'
import { accountSelectors } from '@audius/common/store'
import { Box, useTheme, IconImage, IconButton } from '@audius/harmony'

import {
  getCoverPhotoField,
  getProfileImageField
} from 'common/store/pages/signon/selectors'
import { useCoverPhoto } from 'hooks/useCoverPhoto'
import { useProfilePicture3 } from 'hooks/useUserProfilePicture'
import { useSelector } from 'utils/reducer'

const { getUserId } = accountSelectors

const messages = {
  selectCoverPhoto: 'Upload a cover photo for your profile'
}

type CoverPhotoBannerProps = {
  coverPhotoUrl?: string
  profileImageUrl?: string
  isEditing?: boolean
  // If true, the banner will be rendered as a paper header
  isPaperHeader?: boolean
}

export const CoverPhotoBanner = (props: CoverPhotoBannerProps) => {
  const {
    coverPhotoUrl: propsCoverPhotoUrl,
    profileImageUrl: propsProfileImageUrl,
    isEditing,
    isPaperHeader
  } = props
  const coverPhotoField = useSelector(getCoverPhotoField)
  const profileImageField = useSelector(getProfileImageField)

  const userId = useSelector(getUserId)
  const accountProfilePic = useProfilePicture3({
    userId: userId ?? undefined,
    size: SquareSizes.SIZE_150_BY_150
  })
  const accountCoverPhotoObj = useCoverPhoto(
    userId as number,
    WidthSizes.SIZE_640
  )
  const accountCoverPhoto =
    accountCoverPhotoObj.source === ''
      ? undefined
      : accountCoverPhotoObj.shouldBlur
      ? undefined
      : accountCoverPhotoObj.source

  const { color, spacing, cornerRadius } = useTheme()
  const coverPhoto =
    propsCoverPhotoUrl ?? coverPhotoField?.url ?? accountCoverPhoto
  const profileImage =
    propsProfileImageUrl ?? profileImageField?.url ?? accountProfilePic
  const hasImage = coverPhoto || profileImage

  const hasCurvedBorder = isEditing || isPaperHeader

  return (
    <Box
      h='100%'
      w='100%'
      css={{
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
          backgroundColor: color.background.default,
          // gradient overlay
          background: `linear-gradient(0deg, rgba(0, 0, 0, 0.20) 0%, rgba(0, 0, 0, 0.00) 100%)`,
          // When there is no cover photo we use the profile photo and heavily blur it
          ...(hasImage && !coverPhoto
            ? {
                backdropFilter: 'blur(25px)'
              }
            : undefined),
          ...(hasCurvedBorder && {
            overflow: 'hidden',
            cursor: 'pointer',
            borderTopLeftRadius: cornerRadius.m,
            borderTopRightRadius: cornerRadius.m
          })
        },
        ...(hasImage
          ? {
              backgroundImage: `url(${coverPhoto ?? profileImage})`,
              backgroundPosition: 'center',
              backgroundSize: '100%',
              backgroundRepeat: 'no-repeat, no-repeat'
            }
          : { backgroundColor: color.neutral.n400 })
      }}
    >
      {isEditing ? (
        <IconButton
          aria-label={messages.selectCoverPhoto}
          css={{
            position: 'absolute',
            right: spacing.l,
            top: spacing.l
          }}
          color='staticWhite'
          shadow='drop'
          icon={IconImage}
        />
      ) : null}
    </Box>
  )
}
