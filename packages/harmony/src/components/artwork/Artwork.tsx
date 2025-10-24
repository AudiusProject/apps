import { ComponentProps, useEffect, useRef, useState } from 'react'

import { useTheme } from '@emotion/react'

import { roundedHexClipPath } from '../../icons/SVGDefs'
import { Box, BoxProps } from '../layout/Box'
import { Flex } from '../layout/Flex'
import { Skeleton } from '../skeleton'

const HEXAGON_BORDER_INSET_SCALE = 0.99

export type ArtworkProps = {
  isLoading?: boolean
  borderWidth?: number
  'data-testid'?: string
  noLoading?: boolean
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void
  hex?: boolean
  borderColor?: string
} & Pick<ComponentProps<'img'>, 'src' | 'onError'> &
  BoxProps

/**
 * The artwork component displays entity content and appears in several
 * locations such as track tiles, track and playlist, pages,
 * and the sidebar. It can have interactive elements on hover.
 * This component enhances the listening experience and helps users quickly
 * identify their favorite tracks.
 */
export const Artwork = (props: ArtworkProps) => {
  const {
    isLoading: isLoadingProp,
    src,
    borderRadius = 's',
    borderWidth,
    shadow,
    children,
    'data-testid': testId,
    onError,
    hex = false,
    borderColor,
    ...other
  } = props
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [isLoadingState, setIsLoadingState] = useState(true)
  const isLoading = isLoadingProp ?? isLoadingState
  const { color, motion } = useTheme()

  useEffect(() => {
    setIsLoadingState(true)
  }, [src])

  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoadingState(false)
    }
  }, [src])

  // Helper function to render the common artwork elements
  const renderArtworkElements = (useHexClip: boolean) => (
    <>
      {isLoading ? (
        <Skeleton
          borderRadius={useHexClip ? borderRadius : borderRadius}
          h='100%'
          w='100%'
          css={{
            zIndex: 2,
            position: 'absolute',
            opacity: isLoading ? 1 : 0,
            transition: `opacity ${motion.calm}`,
            clipPath: useHexClip ? `url(#${roundedHexClipPath})` : undefined
          }}
        />
      ) : null}
      <Box
        w='100%'
        pt='100%'
        borderRadius={useHexClip ? borderRadius : borderRadius}
        css={{
          backgroundColor:
            !src && children ? color.neutral.n400 : color.background.surface2,
          clipPath: useHexClip ? `url(#${roundedHexClipPath})` : undefined
        }}
      />
      {src ? (
        <Box
          as='img'
          ref={imgRef}
          borderRadius={useHexClip ? borderRadius : borderRadius}
          h='100%'
          w='100%'
          onLoad={() => {
            setIsLoadingState(false)
          }}
          onError={(event) => {
            setIsLoadingState(false)
            onError?.(event)
          }}
          // @ts-ignore
          src={src}
          data-testid={testId}
          draggable={false}
          css={{
            position: 'absolute',
            top: 0,
            left: 0,
            objectFit: 'cover',
            opacity: isLoading ? 0 : 1,
            transition: `opacity ${motion.calm}`,
            clipPath: useHexClip ? `url(#${roundedHexClipPath})` : undefined
          }}
        />
      ) : null}
      {children ? (
        <Flex
          h='100%'
          w='100%'
          alignItems='center'
          justifyContent='center'
          css={{
            position: 'absolute',
            top: 0,
            left: 0,
            clipPath: useHexClip ? `url(#${roundedHexClipPath})` : undefined
          }}
        >
          {children}
        </Flex>
      ) : null}
    </>
  )

  // For hexagonal artwork, wrap with border and SVG overlay
  if (hex) {
    return (
      <Box {...other} css={{ position: 'relative' }}>
        <Box
          borderRadius={borderRadius}
          border='default'
          shadow={shadow}
          css={{ borderWidth }}
        >
          {renderArtworkElements(true)}
        </Box>
        {/* Hexagonal border overlay */}
        <svg
          width='100%'
          height='100%'
          viewBox='0 0 1 1'
          css={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none'
          }}
        >
          <g
            transform={`translate(${(1 - HEXAGON_BORDER_INSET_SCALE) / 2}, ${
              (1 - HEXAGON_BORDER_INSET_SCALE) / 2
            }) scale(${HEXAGON_BORDER_INSET_SCALE})`}
          >
            <path
              d='M0.966 0.378C0.93 0.301 0.887 0.228 0.839 0.158L0.824 0.136C0.805 0.108 0.779 0.085 0.75 0.068C0.721 0.051 0.688 0.041 0.655 0.039L0.627 0.036C0.543 0.03 0.457 0.03 0.373 0.036L0.346 0.039C0.312 0.041 0.279 0.051 0.25 0.068C0.221 0.085 0.196 0.108 0.177 0.136L0.161 0.158C0.113 0.228 0.07 0.302 0.034 0.378L0.022 0.403C0.008 0.433 0 0.466 0 0.5C0 0.534 0.008 0.567 0.022 0.597L0.034 0.622C0.07 0.698 0.113 0.772 0.161 0.842L0.177 0.864C0.196 0.892 0.221 0.915 0.25 0.932C0.279 0.949 0.312 0.959 0.346 0.961L0.373 0.964C0.457 0.97 0.543 0.97 0.627 0.964L0.655 0.961C0.688 0.959 0.721 0.949 0.75 0.932C0.779 0.915 0.805 0.892 0.824 0.864L0.839 0.842C0.887 0.772 0.93 0.698 0.966 0.622L0.978 0.597C0.992 0.567 1 0.534 1 0.5C1 0.466 0.992 0.433 0.978 0.403L0.966 0.378Z'
              // NOTE - KJ: Adding this to avoid fills being applies to this
              // Occurs in the upload flow when selecting coin gating audience option
              css={{ fill: 'none !important' }}
              fill='none'
              opacity={borderColor ? 1 : 0.3}
              stroke={borderColor || color.neutral.n950}
              strokeWidth={borderColor ? '0.02' : '0.005'}
            />
          </g>
        </svg>
      </Box>
    )
  }

  // For regular artwork
  return (
    <Box {...other}>
      <Box
        borderRadius={borderRadius}
        border='default'
        shadow={shadow}
        css={{ borderWidth }}
      >
        {renderArtworkElements(false)}
      </Box>
    </Box>
  )
}
