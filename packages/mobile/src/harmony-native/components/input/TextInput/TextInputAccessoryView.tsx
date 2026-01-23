import { css } from '@emotion/native'
import { BlurView } from '@react-native-community/blur'
import type { InputAccessoryViewProps } from 'react-native'
import { InputAccessoryView, Keyboard, Platform, View } from 'react-native'

import { PlainButton, useTheme } from '@audius/harmony-native'

const messages = {
  done: 'Done'
}

export const TextInputAccessoryView = (props: InputAccessoryViewProps) => {
  const { type, spacing } = useTheme()

  if (Platform.OS !== 'ios') {
    // InputAccessoryView is only available on iOS
    return null
  }

  return (
    <InputAccessoryView {...props}>
      <View
        style={css({
          position: 'relative',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          width: '100%'
        })}
      >
        <BlurView
          blurType={type === 'day' ? 'thinMaterialLight' : 'thinMaterialDark'}
          blurAmount={20}
          pointerEvents='none'
          style={css({
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          })}
        />
        <PlainButton
          style={css({
            marginRight: spacing.l,
            marginVertical: spacing.m
          })}
          onPress={Keyboard.dismiss}
        >
          {messages.done}
        </PlainButton>
      </View>
    </InputAccessoryView>
  )
}
