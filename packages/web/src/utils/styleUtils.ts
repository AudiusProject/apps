import { CSSObject } from '@emotion/react'

type BackgroundOverlayArgs = {
  color: string
  opacity: number
}

export const backgroundOverlay = ({
  color,
  opacity
}: BackgroundOverlayArgs): CSSObject => ({
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '100%',
    backgroundColor: color,
    opacity
  }
})
