import { useCallback, type ReactNode } from 'react'

import { Keyboard } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button, Flex, PlainButton } from '@audius/harmony-native'
import type { ScreenProps } from 'app/components/core'
import { Screen } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'

import { useRevertOnCancel } from './useRevertOnCancel'

const messages = {
  done: 'Done',
  clear: 'Clear'
}

export type FormScreenProps = ScreenProps & {
  bottomSection?: ReactNode
  onSubmit?: () => void
  onClear?: () => void
  clearable?: boolean
  stopNavigation?: boolean
  disableSubmit?: boolean
  revertOnCancel?: boolean
}

export const FormScreen = (props: FormScreenProps) => {
  const {
    children,
    style,
    bottomSection,
    onClear,
    clearable,
    onSubmit,
    stopNavigation,
    disableSubmit,
    revertOnCancel,
    ...other
  } = props
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const handleSubmit = useCallback(() => {
    Keyboard.dismiss()
    if (!stopNavigation) {
      navigation.goBack()
    }
    onSubmit?.()
  }, [stopNavigation, navigation, onSubmit])

  useRevertOnCancel(revertOnCancel)

  return (
    <Screen
      variant='secondary'
      style={[{ justifyContent: 'space-between' }, style]}
      {...other}
    >
      {children}
      <Flex
        p='l'
        pb={insets.bottom}
        backgroundColor='white'
        borderTop='default'
        gap='m'
      >
        {bottomSection ?? (
          <>
            <Button
              variant='primary'
              fullWidth
              disabled={disableSubmit}
              onPress={handleSubmit}
            >
              {messages.done}
            </Button>
            {onClear ? (
              <PlainButton disabled={!clearable} onPress={onClear} size='large'>
                {messages.clear}
              </PlainButton>
            ) : null}
          </>
        )}
      </Flex>
    </Screen>
  )
}
