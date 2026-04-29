import { ComponentPropsWithoutRef, memo, useMemo } from 'react'

import { Box, Image as HarmonyImage } from '@audius/harmony'
import cn from 'classnames'

import Skeleton from 'components/skeleton/Skeleton'

import styles from './DynamicImage.module.css'

const placeholder =
  'linear-gradient(315deg, var(--harmony-n-100) 0%, var(--harmony-n-50) 100%)'

export type DynamicImageProps = {
  alt?: string
  /** Image URL (or, when isUrl=false, raw value for style.backgroundImage). */
  image?: string
  /**
   * When false, `image` is treated as a style.backgroundImage value (e.g. a
   * gradient or a `url(...)` literal).
   */
  isUrl?: boolean
  /** Optional low-resolution placeholder URL for progressive loading. */
  priorityLowResImage?: string
  /** Classes to apply to the wrapper. */
  wrapperClassName?: string
  /** Classes to apply to the skeleton. */
  skeletonClassName?: string
  /** Styles to apply to the image itself. */
  imageStyle?: object
  /** Whether to immediately show the image (skip fade animation). */
  immediate?: boolean
  /** Immediately removes animating-out images. */
  immediatelyLeave?: boolean
  /** Whether to use a skeleton while loading. */
  useSkeleton?: boolean
  /** Don't use shimmer for the skeleton. */
  noShimmer?: boolean
  /** Whether to use the default placeholder gradient when no image is set. */
  usePlaceholder?: boolean
  /** Whether to blur the background image (frosted-glass overlay). */
  useBlur?: boolean
} & ComponentPropsWithoutRef<'div'>

/**
 * DynamicImage — a backwards-compatible wrapper around Harmony's Image
 * primitive that supports the legacy "background image" pattern.
 *
 * Most callers should prefer `<Image>` from `@audius/harmony` directly. This
 * wrapper exists to keep the existing call sites working while delegating to
 * the new progressive-loading-capable primitive.
 *
 * When `isUrl=false` (legacy behavior), `image` is interpreted as a CSS
 * `background-image` value (e.g. a gradient or a `url(...)` literal) and we
 * fall back to a plain background-image-on-a-div approach.
 */
const DynamicImage = ({
  image,
  isUrl = true,
  priorityLowResImage,
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
  const displayImage = useMemo(() => {
    if (image) return image
    if (usePlaceholder) return placeholder
    return undefined
  }, [image, usePlaceholder])

  // Detect "non-URL" usages: gradients, raw url(...) strings, etc. These can't
  // go through <img>, so we render a div with backgroundImage (legacy path).
  const isBackgroundImage =
    !isUrl || (displayImage?.includes('linear-gradient(') ?? false)

  const showPlaceholderSkeleton =
    useSkeleton && (!displayImage || displayImage === placeholder)

  const accessibilityProps =
    alt === undefined
      ? {}
      : alt === ''
        ? { 'aria-hidden': true as const }
        : { role: 'img' as const, 'aria-label': alt }

  if (isBackgroundImage || !displayImage) {
    // Legacy fallback: render a div with backgroundImage. This handles
    // gradients and the placeholder gradient.
    const bgImage =
      displayImage && displayImage.includes('linear-gradient(')
        ? displayImage
        : displayImage
          ? isUrl
            ? `url(${displayImage})`
            : displayImage
          : undefined

    return (
      <Box
        className={cn(styles.wrapper, wrapperClassName)}
        {...other}
        {...accessibilityProps}
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
        {showPlaceholderSkeleton ? (
          <Skeleton
            className={cn(styles.skeleton, skeletonClassName)}
            noShimmer={noShimmer}
          />
        ) : null}
        <div
          className={cn(styles.image, className)}
          style={{
            ...imageStyle,
            backgroundImage: bgImage,
            opacity: bgImage ? 1 : 0,
            transition: `opacity ${immediate ? '0.1s' : '0.3s'} ease-in-out`
          }}
          onClick={onClick}
          data-testid='dynamic-image-bg'
        />
        {children ? <div className={styles.children}>{children}</div> : null}
      </Box>
    )
  }

  // Modern path: delegate to Harmony Image for true progressive loading.
  return (
    <Box
      className={cn(styles.wrapper, wrapperClassName)}
      {...other}
      {...accessibilityProps}
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
      <HarmonyImage
        src={displayImage}
        priorityLowResSrc={priorityLowResImage}
        alt={alt ?? ''}
        useSkeleton={useSkeleton}
        immediate={immediate}
        onClick={onClick}
        className={className}
        css={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          ...imageStyle
        }}
      />
      {children ? <div className={styles.children}>{children}</div> : null}
    </Box>
  )
}

export default memo(DynamicImage)
