import React, { useCallback, useRef } from 'react'

import { walletMessages } from '@audius/common/messages'
import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Flex,
  IconButton,
  IconInfo,
  Text,
  useTheme
} from '@audius/harmony-native'

const messages = {
  text: walletMessages.cashBalanceTooltip
}

type TooltipInfoIconProps = {
  ariaLabel?: string
  size?: 's' | 'm' | 'l'
  color?: 'subdued' | 'default'
  title?: string
  message?: string
}

export const TooltipInfoIcon = ({
  ariaLabel = 'Information',
  size = 's',
  color = 'subdued',
  title = walletMessages.cashBalance,
  message = messages.text
}: TooltipInfoIconProps) => {
  const insets = useSafeAreaInsets()
  const { color: themeColor } = useTheme()

  const bottomSheetModalRef = useRef<BottomSheetModal>(null)

  const handleOpenInfoModal = useCallback(() => {
    bottomSheetModalRef.current?.present()
  }, [])

  return (
    <>
      <IconButton
        icon={IconInfo}
        size={size}
        color={color}
        aria-label={ariaLabel}
        onPress={handleOpenInfoModal}
        style={{ padding: 0 }}
      />

      <BottomSheetModal
        ref={bottomSheetModalRef}
        snapPoints={['25%']}
        topInset={insets.top}
        backgroundStyle={{ backgroundColor: themeColor.background.white }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior='close'
          />
        )}
      >
        <Flex p='l'>
          <Text variant='title' size='m'>
            {title}
          </Text>
          <Box mt='m'>
            <Text variant='body' size='m'>
              {message}
            </Text>
          </Box>
        </Flex>
      </BottomSheetModal>
    </>
  )
}
