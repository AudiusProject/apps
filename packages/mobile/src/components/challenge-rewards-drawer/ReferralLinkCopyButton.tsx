import { useCallback } from 'react'

import Clipboard from '@react-native-clipboard/clipboard'
import { Animated, View, TouchableHighlight } from 'react-native'

import { LinearGradient, IconCopy } from '@audius/harmony-native'
import Text from 'app/components/text'
import { usePressScaleAnimation } from 'app/hooks/usePressScaleAnimation'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'
import { getGradientStartEnd } from 'app/utils/linearGradient'
import { useThemeColors } from 'app/utils/theme'

const messages = {
  copyPrompt: 'Copy Invite to Clipboard',
  copyNotice: 'Referral link copied to the clipboard'
}
const useStyles = makeStyles(({ palette }) => ({
  copyPromptContainer: {
    width: '100%'
  },
  borderRadius: {
    borderRadius: 6
  },
  copyTextContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12
  },
  copyText: {
    fontSize: 18,
    textAlign: 'center',
    color: palette.staticWhite
  },
  iconCopy: {
    color: palette.staticWhite,
    lineHeight: 16,
    marginRight: 8
  }
}))

export const ReferralLinkCopyButton = ({
  inviteUrl
}: {
  inviteUrl: string
}) => {
  const { pageHeaderGradientColor1, pageHeaderGradientColor2 } =
    useThemeColors()
  const styles = useStyles()

  const { toast } = useToast()
  const onCopyClicked = useCallback(() => {
    Clipboard.setString(inviteUrl)
    toast({ content: messages.copyNotice, type: 'info' })
  }, [inviteUrl, toast])

  // Button animation
  const { scale, handlePressIn, handlePressOut } = usePressScaleAnimation()
  return (
    <Animated.View
      style={[styles.copyPromptContainer, { transform: [{ scale }] }]}
    >
      <TouchableHighlight
        style={styles.borderRadius}
        onPress={onCopyClicked}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <LinearGradient
          style={[styles.borderRadius]}
          {...getGradientStartEnd(350)}
          colors={[pageHeaderGradientColor1, pageHeaderGradientColor2]}
          locations={[0.0204, 1]}
        >
          <View style={styles.copyTextContainer}>
            <IconCopy
              style={styles.iconCopy}
              width={24}
              height={24}
              color='white'
            />
            <Text weight={'bold'} style={styles.copyText}>
              {messages.copyPrompt}
            </Text>
          </View>
        </LinearGradient>
      </TouchableHighlight>
    </Animated.View>
  )
}
