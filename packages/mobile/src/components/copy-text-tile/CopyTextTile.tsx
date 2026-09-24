import { useCallback } from 'react'

import Clipboard from '@react-native-clipboard/clipboard'
import { View } from 'react-native'

import { LinearGradient, IconCopy } from '@audius/harmony-native'
import { Tile, Text } from 'app/components/core'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

const messages = {
  copyNotice: 'Copied to clipboard'
}

const useStyles = makeStyles(({ spacing, palette, typography }) => ({
  tile: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(11)
  },
  hint: {
    textAlign: 'center',
    color: palette.statTileText,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 15,
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontByWeight.bold,
    marginBottom: spacing(4)
  },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(4)
  },
  text: {
    color: palette.staticWhite,
    textAlign: 'center',
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontByWeight.bold
  },
  icon: {
    marginLeft: spacing(3)
  }
}))

type CopyTextTileProps = {
  /**
   * A hint to show at the top of the tile so the user knows what to do
   */
  hint: string
  /**
   * The text to copy
   */
  text: string
}

export const CopyTextTile = (props: CopyTextTileProps) => {
  const { hint, text } = props
  const styles = useStyles()
  const { pageHeaderGradientColor1, pageHeaderGradientColor2, staticWhite } =
    useThemeColors()

  const { toast } = useToast()

  const handleCopy = useCallback(() => {
    Clipboard.setString(text)
    toast({ content: messages.copyNotice, type: 'info' })
  }, [text, toast])

  return (
    <Tile
      styles={{ tile: styles.tile }}
      as={LinearGradient}
      colors={[pageHeaderGradientColor1, pageHeaderGradientColor2]}
      start={{ x: 1, y: 1 }}
      end={{ x: 0, y: 0 }}
      onPress={handleCopy}
    >
      <Text style={styles.hint}>{hint}</Text>
      <View style={styles.copy}>
        <Text style={styles.text}>{text}</Text>
        <View style={styles.icon}>
          <IconCopy fill={staticWhite} height={24} width={24} />
        </View>
      </View>
    </Tile>
  )
}
