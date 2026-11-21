import type { ReactNode } from 'react'
import React, { useMemo } from 'react'

import { css } from '@emotion/native'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Flex, Paper, spacing } from '@audius/harmony-native'

import { useBottomBarInset } from './BottomBarInsetContext'
import { KeyboardAvoidingView } from './KeyboardAvoidingView'

type FixedFooterProps = {
  children: ReactNode
  avoidKeyboard?: boolean
  keyboardShowingOffset?: number
}

export const FIXED_FOOTER_HEIGHT = 48 + spacing.l * 2 + spacing.xl

export const FixedFooter = ({
  children,
  avoidKeyboard = false,
  keyboardShowingOffset = spacing.unit5
}: FixedFooterProps) => {
  const insets = useSafeAreaInsets()
  const bottomBarInset = useBottomBarInset()

  const KeyboardAvoidContainer = useMemo(() => {
    return avoidKeyboard ? KeyboardAvoidingView : View
  }, [avoidKeyboard])

  return (
    <Flex
      gap='xl'
      w='100%'
      style={css({
        position: 'absolute',
        bottom: bottomBarInset || (insets.bottom === 0 ? spacing.l : 0),
        left: 0
      })}
    >
      <KeyboardAvoidContainer
        keyboardShowingOffset={keyboardShowingOffset + bottomBarInset}
      >
        <Paper
          p='l'
          justifyContent='center'
          gap='s'
          alignItems='center'
          direction='column'
          shadow='midInverted'
          style={css({
            borderRadius: 0,
            paddingBottom: bottomBarInset ? spacing.l : insets.bottom
          })}
        >
          {children}
        </Paper>
      </KeyboardAvoidContainer>
    </Flex>
  )
}

export const FixedFooterContent = ({
  children,
  ...props
}: { children: ReactNode } & React.ComponentProps<typeof Flex>) => {
  const bottomBarInset = useBottomBarInset()
  return (
    <Flex
      direction='column'
      flex={1}
      style={{
        paddingBottom: FIXED_FOOTER_HEIGHT + bottomBarInset
      }}
      {...props}
    >
      {children}
    </Flex>
  )
}
