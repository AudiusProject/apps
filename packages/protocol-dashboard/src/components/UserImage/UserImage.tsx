import React, { useEffect, useState } from 'react'

import clsx from 'clsx'

import { useUserProfile } from 'store/cache/user/hooks'
import { Address } from 'types'

import styles from './UserImage.module.css'

type UserImageProps = {
  className?: string
  imgClassName?: string
  wallet: Address
  alt: string
  hasLoaded?: () => void
  useSkeleton?: boolean
}

const preload = async (image: string, cb: () => void) => {
  await new Promise((resolve) => {
    const i = new Image()
    i.src = image
    i.onload = cb
  })
}

const UserImage = ({
  imgClassName,
  className,
  wallet,
  alt,
  hasLoaded,
  useSkeleton = true
}: UserImageProps) => {
  const { image } = useUserProfile({ wallet })
  const [preloaded, setPreloaded] = useState(false)
  useEffect(() => {
    if (image) {
      preload(image, () => setPreloaded(true))
    }
    if (image && hasLoaded) hasLoaded()
  }, [image, hasLoaded])

  return (
    <div
      className={clsx(styles.skeleton, className, {
        [styles.noSkeleton]: !useSkeleton
      })}
    >
      <img
        className={clsx(className, imgClassName, {
          [styles.show]: !!image && preloaded
        })}
        src={image || undefined}
        alt={alt}
      />
    </div>
  )
}

export default UserImage
