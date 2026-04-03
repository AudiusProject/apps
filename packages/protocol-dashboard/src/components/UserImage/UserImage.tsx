import React, { useEffect, useState } from 'react'

import clsx from 'clsx'

import MirrorImage from 'components/MirrorImage/MirrorImage'
import { useUserProfile } from 'store/cache/user/hooks'
import { Address } from 'types'
import { getImageUrls } from 'utils/imageUrls'

import styles from './UserImage.module.css'

type UserImageProps = {
  className?: string
  imgClassName?: string
  wallet: Address
  alt: string
  hasLoaded?: () => void
  useSkeleton?: boolean
}

const UserImage = ({
  imgClassName,
  className,
  wallet,
  alt,
  hasLoaded,
  useSkeleton = true
}: UserImageProps) => {
  const { image, profilePicture } = useUserProfile({ wallet })
  const [loaded, setLoaded] = useState(false)

  // Build mirror URLs from the profilePicture object if available
  const mirrorUrls = profilePicture
    ? getImageUrls(profilePicture as Record<string, any>)
    : []

  // Use mirror URLs if available, otherwise fall back to single image
  const urls = mirrorUrls.length > 0 ? mirrorUrls : image ? [image] : []

  useEffect(() => {
    if (image && hasLoaded) hasLoaded()
  }, [image, hasLoaded])

  return (
    <div
      className={clsx(styles.skeleton, className, {
        [styles.noSkeleton]: !useSkeleton
      })}
    >
      <MirrorImage
        urls={urls}
        alt={alt}
        className={clsx(className, imgClassName, {
          [styles.show]: urls.length > 0 && loaded
        })}
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}

export default UserImage
