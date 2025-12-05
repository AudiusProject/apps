import { useState, useEffect } from 'react'

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
import { MountPlacement } from 'components/types'
import { useProfilePicture } from 'hooks/useProfilePicture'

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

  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [userId])

  const handleError = () => {
    setHasError(true)
  }

  const profileImage = useProfilePicture({
    userId: userId ?? undefined,
    size: imageSize
  })

  const image = userId ? profileImage : imageProfilePicEmptyNew

  const finalImageSrc = hasError ? imageProfilePicEmptyNew : image

  const { data: currentUserId } = useCurrentUserId()
  const { data: userName } = useUser(userId, {
    select: (user) => user.name
  })
  const displayName = userId === currentUserId ? messages.your : userName

  const label = `${messages.goTo} ${displayName} ${messages.profile}`

  if (ariaHidden) {
    return (
      <HarmonyAvatar
        key={hasError ? 'error' : 'no-error'}
        src={finalImageSrc}
        onError={handleError}
        {...other}
      />
    )
  }

  if (onClick) {
    return (
      <HarmonyAvatar
        key={hasError ? 'error' : 'no-error'}
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
        popoverMount={MountPlacement.PARENT}
        noOverflow={popover}
      >
        <HarmonyAvatar
          key={hasError ? 'error' : 'no-error'}
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
      key={hasError ? 'error' : 'no-error'}
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
