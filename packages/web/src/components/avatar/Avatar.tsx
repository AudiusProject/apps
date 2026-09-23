import { useState, useEffect, useCallback, SyntheticEvent } from 'react'

import { useCurrentUserId, useUser } from '@audius/common/api'
import { imageProfilePicEmptyNew } from '@audius/common/assets'
import { SquareSizes, ID } from '@audius/common/models'
import { Maybe, Nullable } from '@audius/common/utils'
import {
  Avatar as HarmonyAvatar,
  type AvatarProps as HarmonyAvatarProps
} from '@audius/harmony'

import { componentWithErrorBoundary } from 'components/error-wrapper/componentWithErrorBoundary'
import { UserLink } from 'components/link'
import { useProfilePictureSource } from 'hooks/useProfilePicture'

const messages = {
  goTo: 'Go to',
  your: 'your',
  profile: 'profile'
}

export type AvatarProps = Omit<HarmonyAvatarProps, 'src' | 'popover'> & {
  'aria-hidden'?: true
  userId: Maybe<Nullable<ID>>
  onClick?: () => void
  imageSize?: SquareSizes
  popover?: boolean
  disableLink?: boolean // Prevents Avatar from wrapping with UserLink when already inside a link
}

export const AvatarContent = (props: AvatarProps) => {
  const {
    userId,
    onClick,
    'aria-hidden': ariaHidden,
    imageSize = SquareSizes.SIZE_150_BY_150,
    popover,
    disableLink,
    ...other
  } = props

  // The src that last failed. Stored as a url, not a boolean, so a later
  // mirror url from useImageSize can still render.
  const [failedSrc, setFailedSrc] = useState<Nullable<string>>(null)

  useEffect(() => {
    setFailedSrc(null)
  }, [userId])

  const { imageUrl: profileImage, onError: onImageError } =
    useProfilePictureSource({
      userId: userId ?? undefined,
      size: imageSize
    })

  const handleError = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      const src = event.currentTarget.src
      setFailedSrc(src)
      // Let useImageSize try the next mirror. Once all fail, the data-uri
      // placeholder below sticks.
      onImageError?.(src)
    },
    [onImageError]
  )

  const image = userId ? profileImage : imageProfilePicEmptyNew

  const finalImageSrc =
    image && image === failedSrc ? imageProfilePicEmptyNew : image

  const { data: currentUserId } = useCurrentUserId()
  const { data: userName } = useUser(userId, {
    select: (user) => user.name
  })
  const displayName = userId === currentUserId ? messages.your : userName

  const label = `${messages.goTo} ${displayName} ${messages.profile}`

  if (ariaHidden) {
    return (
      <HarmonyAvatar
        key={finalImageSrc}
        src={finalImageSrc}
        onError={handleError}
        {...other}
      />
    )
  }

  if (onClick) {
    return (
      <HarmonyAvatar
        key={finalImageSrc}
        role='button'
        tabIndex={0}
        aria-label={label}
        onClick={onClick}
        css={{ cursor: 'pointer' }}
        src={finalImageSrc}
        onError={handleError}
        {...other}
      />
    )
  }

  if (userId && !disableLink) {
    return (
      <UserLink
        userId={userId}
        popover={popover}
        noText
        aria-label={label}
        noOverflow={popover}
      >
        <HarmonyAvatar
          key={finalImageSrc}
          data-testid='avatar-test'
          src={finalImageSrc}
          onError={handleError}
          {...other}
        />
      </UserLink>
    )
  }

  return (
    <HarmonyAvatar
      key={finalImageSrc}
      src={finalImageSrc}
      onError={handleError}
      {...other}
    />
  )
}

export const Avatar = componentWithErrorBoundary(AvatarContent, {
  name: 'Avatar',
  fallback: <HarmonyAvatar src={imageProfilePicEmptyNew} h='3xl' w='3xl' />
})
