import {
  memo,
  useEffect,
  useRef,
  RefObject,
  ComponentPropsWithoutRef
} from 'react'

import { useInstanceVar } from '@audius/common/hooks'
import { Box } from '@audius/harmony'
import cn from 'classnames'

import transparentPlaceholderImg from 'assets/img/1x1-transparent.png'
import Skeleton from 'components/skeleton/Skeleton'

import styles from './DynamicImage.module.css'

const placeholder =
  'linear-gradient(315deg, var(--harmony-n-100) 0%, var(--harmony-n-50) 100%)'

export type DynamicImageProps = {
  alt?: string
  // Image URL (or style.backgroundImage)
  image?: string
  // Whether or not the image is a full URL. This can be set to false
  // and the image prop is treated as the entire style.backgroundImage
  isUrl?: boolean
  // Classes to apply to the wrapper
  wrapperClassName?: string
  // Classes to apply to the skeleton
  skeletonClassName?: string
  // Styles to apply to the image itself
  imageStyle?: object
  // Whether or not to immediately animate
  immediate?: boolean
  // Immediately removes animating-out images
  immediatelyLeave?: boolean
  // Whether or not to use a skeleton while loading
  useSkeleton?: boolean
  // Don't use shimmer for the skeleton
  noShimmer?: boolean
  // Whether or not to use the default placeholder
  usePlaceholder?: boolean
  // Whether or not to blur the background image
  useBlur?: boolean
} & ComponentPropsWithoutRef<'div'>

const moveBehind = (ref: RefObject<HTMLDivElement | null>) => {
  if (ref.current) {
    ref.current.style.animation = 'none'
    ref.current.style.zIndex = '1'
    ref.current.style.backgroundColor = 'unset'
  }
}

const fadeIn = (
  ref: RefObject<HTMLDivElement | null>,
  isUrl: boolean,
  image: string,
  immediate: boolean
) => {
  if (ref.current) {
    ref.current.style.zIndex = '2'
    ref.current.style.removeProperty('background-color')

    if (image === placeholder) {
      ref.current.style.backgroundColor = 'unset'
      ref.current.style.backgroundImage = `${image}`
      ref.current.style.transition = 'unset'
      ref.current.style.opacity = '1'
      return
    }

    // Set default background color for static images (transparent background defaults)
    if (image.includes('/static')) {
      ref.current.style.backgroundColor = 'var(--harmony-n-300)'
    } else if (
      !image.startsWith('data:image/png') &&
      !image.startsWith('/@fs')
    ) {
      ref.current.style.backgroundColor = 'unset'
    }

    // Allow gradient values for 'image' in addition to URIs
    ref.current.style.backgroundImage = image.includes('linear-gradient(')
      ? `${image}`
      : isUrl
        ? `url(${image})`
        : image
    ref.current.style.transition = `opacity ${
      immediate ? '0.1s' : '0.3s'
    } ease-in-out`
    ref.current.style.opacity = '1'
  }
}

/**
 * A dynamic image that transitions between changes to the `image` prop.
 */
const DynamicImage = ({
  image,
  isUrl = true,
  wrapperClassName,
  className,
  skeletonClassName,
  imageStyle,
  immediate = false,
  children,
  onClick,
  usePlaceholder = true,
  useSkeleton = true,
  useBlur = false,
  alt,
  noShimmer,
  ...other
}: DynamicImageProps) => {
  const first = useRef<HTMLDivElement>(null)
  const second = useRef<HTMLDivElement>(null)
  const [getIsFirstActive, setIsFirstActive] = useInstanceVar(true)

  const [getPrevImage, setPrevImage] = useInstanceVar('') // no previous image

  // The actual image to display (maybe placeholder)
  let displayImage: string
  if (usePlaceholder) {
    displayImage = image || placeholder
  } else {
    displayImage = image || (transparentPlaceholderImg as string)
  }

  useEffect(() => {
    if (first.current && second.current) {
      // Not the first time the image is loading and the image hasn't changed
      if (getPrevImage() !== '' && getPrevImage() === displayImage) {
        return
      }
      setPrevImage(displayImage)

      if (getIsFirstActive()) {
        moveBehind(second)
        fadeIn(
          first,
          !!isUrl,
          displayImage,
          !!immediate || displayImage === placeholder
        )

        setIsFirstActive(false)
      } else {
        moveBehind(first)
        fadeIn(second, !!isUrl, displayImage, !!immediate)

        setIsFirstActive(true)
      }
    }
  }, [
    isUrl,
    displayImage,
    first,
    second,
    getPrevImage,
    setPrevImage,
    getIsFirstActive,
    setIsFirstActive,
    immediate
  ])
  return (
    <Box
      className={cn(styles.wrapper, wrapperClassName)}
      {...other}
      role='img'
      aria-label={alt}
      css={{
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
          ...(useBlur
            ? {
                backdropFilter: 'blur(25px)',
                zIndex: 3
              }
            : undefined)
        }
      }}
    >
      {useSkeleton && displayImage === placeholder ? (
        <Skeleton
          className={cn(styles.skeleton, skeletonClassName)}
          noShimmer={noShimmer}
        />
      ) : null}
      <div
        ref={first}
        className={cn(styles.image, className)}
        style={imageStyle}
        onClick={onClick}
        data-testid='dynamic-image-first'
      />
      <div
        ref={second}
        className={cn(styles.image, className)}
        style={imageStyle}
        onClick={onClick}
        data-testid='dynamic-image-second'
      />
      {children && <div className={styles.children}>{children}</div>}
    </Box>
  )
}

export default memo(DynamicImage)
