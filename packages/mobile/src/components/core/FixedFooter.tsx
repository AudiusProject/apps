import type { ReactNode } from 'react'
import React, { useMemo } from 'react'

import { css } from '@emotion/native'
import { Dimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Flex, Paper, spacing } from '@audius/harmony-native'
import { KeyboardAvoidingView } from 'app/components/core'

type FixedFooterProps = {
  children: ReactNode
  avoidKeyboard?: boolean
  keyboardShowingOffset?: number
}

/**
 * The default height calculation for the fixed footer
 * Formula: button height (48) + footer padding (2*spacing.l) + extra padding (spacing.xl)
 */
export const FIXED_FOOTER_HEIGHT = 48 + spacing.l * 2 + spacing.xl

/**
 * A fixed footer component that sticks to the bottom of the screen.
 * Handles safe area insets and optional keyboard avoidance.
 * Based on the PageFooter pattern from sign-on screens.
 *
 * When using this component, wrap your main content in a Flex with flex={1}
 * and add paddingBottom: FIXED_FOOTER_HEIGHT to prevent content from being hidden.
 */
export const FixedFooter = ({
  children,
  avoidKeyboard = false,
  keyboardShowingOffset = spacing.unit5
}: FixedFooterProps) => {
  const insets = useSafeAreaInsets()

  const KeyboardAvoidContainer = useMemo(() => {
    return avoidKeyboard ? KeyboardAvoidingView : View
  }, [avoidKeyboard])

  return (
    <Flex
      gap='xl'
      w={Dimensions.get('window').width}
      style={css({
        position: 'absolute',
        bottom: insets.bottom === 0 ? spacing.l : 0,
        left: 0
      })}
    >
      <KeyboardAvoidContainer keyboardShowingOffset={keyboardShowingOffset}>
        <Paper
          p='l'
          justifyContent='center'
          gap='s'
          alignItems='center'
          direction='column'
          shadow='midInverted'
          style={css({
            borderRadius: 0,
            paddingBottom: insets.bottom
          })}
        >
          {children}
        </Paper>
      </KeyboardAvoidContainer>
    </Flex>
  )
}

/**
 * Helper component that wraps content with appropriate padding for FixedFooter
 */
export const FixedFooterContent = ({
  children,
  ...props
}: { children: ReactNode } & React.ComponentProps<typeof Flex>) => {
  return (
    <Flex
      direction='column'
      flex={1}
      style={{
        paddingBottom: FIXED_FOOTER_HEIGHT
      }}
      {...props}
    >
      {children}
    </Flex>
  )
}
