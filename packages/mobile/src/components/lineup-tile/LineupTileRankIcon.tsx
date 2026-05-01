import { View } from 'react-native'

import { IconCrown, IconTrending } from '@audius/harmony-native'
import Text from 'app/components/text'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

import { useStyles as useTrackTileStyles } from './styles'

const useStyles = makeStyles(({ palette, spacing }) => ({
  text: {
    color: palette.secondary
  },
  icon: {
    marginRight: spacing(1)
  }
}))

type LineupTileRankIconProps = {
  /** Index of this item in the lineup */
  index: number
}

export const LineupTileRankIcon = (props: LineupTileRankIconProps) => {
  const { index } = props
  const styles = useStyles()
  const trackTileStyles = useTrackTileStyles()
  const { secondary } = useThemeColors()
  const Icon = index < 10 ? IconCrown : IconTrending
  return (
    <View style={trackTileStyles.statItem}>
      <Icon fill={secondary} style={styles.icon} height={14} width={14} />
      <Text style={[trackTileStyles.statText, styles.text]}>{index + 1}</Text>
    </View>
  )
}
