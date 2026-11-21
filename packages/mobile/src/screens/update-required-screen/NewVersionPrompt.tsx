import { useCallback } from 'react'

import { View } from 'react-native'

import { IconCloudDownload, Button } from '@audius/harmony-native'
import { GradientText, Text, useLink } from 'app/components/core'
import { makeStyles } from 'app/styles'

const useStyles = makeStyles(({ spacing }) => ({
  contentContainer: {
    paddingTop: spacing(32),
    paddingBottom: spacing(8),
    paddingHorizontal: spacing(6)
  },
  header: {
    fontSize: 24,
    lineHeight: 52,
    textAlign: 'center',
    textShadowOffset: { height: 2, width: 0 },
    textShadowRadius: 4,
    textShadowColor: 'rgba(162,47,235,0.2)'
  },
  text: {
    textAlign: 'center',
    marginBottom: spacing(8),
    marginTop: spacing(6)
  }
}))

type NewVersionPromptProps = {
  headerText: string
  contentText: string
  buttonText: string
  url?: string
  onPress?: () => void
}

export const NewVersionPrompt = ({
  headerText,
  contentText,
  buttonText,
  url,
  onPress: onPressProp
}: NewVersionPromptProps) => {
  const styles = useStyles()

  const { onPress: onPressLink } = useLink(url ?? '')

  const handlePress = useCallback(() => {
    onPressProp?.()
    if (url) {
      onPressLink()
    }
  }, [onPressProp, url, onPressLink])

  return (
    <View style={styles.contentContainer}>
      <GradientText accessibilityRole='header' style={styles.header}>
        {headerText}
      </GradientText>
      <Text variant='h1' style={styles.text}>
        {contentText}
      </Text>
      {!url && !onPressProp ? null : (
        <Button iconLeft={IconCloudDownload} onPress={handlePress}>
          {buttonText}
        </Button>
      )}
    </View>
  )
}
