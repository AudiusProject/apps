import {
  ComponentPropsWithoutRef,
  CSSProperties,
  ImgHTMLAttributes,
  forwardRef,
  useEffect,
  useRef,
  useState
} from 'react'

import { useTheme } from '@emotion/react'

import { Box, BoxProps } from '../layout/Box'
import { Skeleton } from '../skeleton'

import styles from './Image.module.css'

type NativeImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'placeholder'>

export type ImageProps = {
  /** High-resolution image URL. */
  src?: string
  /**
   * Optional low-resolution placeholder image URL. When provided, this is
   * displayed immediately while the high-resolution image loads, then a smooth
   * crossfade reveals the high-res image.
   */
  priorityLowResSrc?: string
  /** Alt text for accessibility. Empty string marks the image decorative. */
  alt?: string
  /** Whether to show a skeleton while loading. Defaults to true. */
  useSkeleton?: boolean
  /** Whether to use the image's loading attribute (lazy by default). */
  loading?: 'lazy' | 'eager'
  /** CSS object-fit applied to the image. Defaults to 'cover'. */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  /** Inline style applied to the underlying `<img>` element. */
  style?: CSSProperties
  /** Called when the high-res image successfully loads. */
  onLoad?: NativeImgProps['onLoad']
  /** Called when the high-res image fails to load. */
  onError?: NativeImgProps['onError']
  /** When true, skips animations and shows the image immediately. */
  immediate?: boolean
  /** Additional native <img> attributes (srcSet, sizes, crossOrigin, etc.). */
  imgProps?: Omit<NativeImgProps, 'src' | 'alt' | 'onLoad' | 'onError'>
  /** Optional data-testid forwarded to the underlying <img>. */
  'data-testid'?: string
} & Omit<BoxProps, 'children' | 'as'> &
  Pick<ComponentPropsWithoutRef<'div'>, 'children'>

/**
 * Harmony Image — a progressive-loading image primitive.
 *
 * Behavior:
 *  - Renders a skeleton placeholder while the image loads (toggleable).
 *  - When `priorityLowResSrc` is provided, renders the low-res image immediately
 *    and crossfades to the high-res once it loads.
 *  - Native `loading="lazy"` and `decoding="async"` for off-screen images.
 *  - Crossfades smoothly when `src` changes.
 *
 * Use this anywhere you would have used a raw `<img>` tag. The outer wrapper
 * fills its parent by default — pass `h`/`w` BoxProps (or a className with
 * dimensions) for cases where the parent doesn't constrain the size.
 */
export const Image = forwardRef<HTMLDivElement, ImageProps>(
  function Image(props, ref) {
    const {
      src,
      priorityLowResSrc,
      alt,
      useSkeleton = true,
      loading = 'lazy',
      objectFit = 'cover',
      style,
      onLoad,
      onError,
      immediate = false,
      imgProps,
      children,
      borderRadius,
      className,
      'data-testid': testId,
      ...other
    } = props

    const imgRef = useRef<HTMLImageElement | null>(null)
    const { motion } = useTheme()
    const [isLoaded, setIsLoaded] = useState(false)
    const [hasError, setHasError] = useState(false)

    // When src changes, reset error state so a retry can re-fade-in. We don't
    // reset isLoaded preemptively here because doing so causes a brief skeleton
    // flash even when the next image is already cached.
    useEffect(() => {
      setHasError(false)
    }, [src])

    const transition = immediate
      ? 'opacity 0.1s ease-in-out'
      : `opacity ${motion.calm}`

    const showSkeleton = useSkeleton && !isLoaded && !priorityLowResSrc
    const showLowRes = !!priorityLowResSrc && !isLoaded
    const accessibilityProps =
      alt === ''
        ? { 'aria-hidden': true as const, alt: '' }
        : alt !== undefined
          ? { alt, role: 'img' as const }
          : {}

    const baseImgStyle = {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit
    }

    // The outer Box defaults to filling its parent via Image.module.css .root
    // (height/width 100%). Because the CSS module is injected before any
    // consumer CSS module (import order), consumer classes win for conflicts,
    // letting callers override sizing via className without fighting Emotion.
    const rootClassName = className
      ? `${styles.root} ${className}`
      : styles.root

    return (
      <Box
        ref={ref}
        borderRadius={borderRadius}
        className={rootClassName}
        {...other}
        css={{ position: 'relative', overflow: 'hidden' }}
      >
        {showSkeleton ? (
          <Skeleton
            h='100%'
            w='100%'
            borderRadius={borderRadius}
            css={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
          />
        ) : null}

        {showLowRes ? (
          <img
            src={priorityLowResSrc}
            alt=''
            aria-hidden
            draggable={false}
            css={{
              ...baseImgStyle,
              zIndex: 1,
              // Slight blur smooths the visual jump from low-res to high-res.
              filter: 'blur(8px)',
              transform: 'scale(1.05)'
            }}
          />
        ) : null}

        {src ? (
          <img
            ref={imgRef}
            src={src}
            loading={loading}
            decoding='async'
            draggable={false}
            data-testid={testId}
            {...accessibilityProps}
            {...imgProps}
            onLoad={(e) => {
              setIsLoaded(true)
              onLoad?.(e)
            }}
            onError={(e) => {
              setHasError(true)
              setIsLoaded(true)
              onError?.(e)
            }}
            style={style}
            css={{
              ...baseImgStyle,
              opacity: isLoaded && !hasError ? 1 : 0,
              transition,
              zIndex: 2
            }}
          />
        ) : null}

        {children ? (
          <Box
            h='100%'
            w='100%'
            css={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {children}
          </Box>
        ) : null}
      </Box>
    )
  }
)
