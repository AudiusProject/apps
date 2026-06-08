import type { StyleProp, ViewStyle } from 'react-native'

import { TrackFlair, Size } from 'app/components/track-flair'

import { useStyles as useTrackTileStyles } from './styles'
import type { RenderImage } from './types'

type LineupTileArtProps = {
  renderImage: RenderImage
  style?: StyleProp<ViewStyle>
  trackId: number
}

export const LineupTileArt = (props: LineupTileArtProps) => {
  const { renderImage, style, trackId } = props
  const trackTileStyles = useTrackTileStyles()

  return (
    <TrackFlair
      trackId={trackId}
      size={Size.SMALL}
      style={[style, trackTileStyles.image]}
    >
      {renderImage({ style: trackTileStyles.image })}
    </TrackFlair>
  )
}
