import { useEffect, useState } from 'react'

import { Box, Flex, IconCaretDown, Text } from '@audius/harmony'

import BottomSheetActionDrawer from 'components/action-drawer/BottomSheetActionDrawer'

type MobileFilterButtonTypes = {
  options: { value: string; label?: string }[]
  onClose?: () => void
  onSelect?: (value: string) => void
  selection?: string
  zIndex?: number
}

export const MobileFilterButton = ({
  options,
  onClose,
  onSelect,
  selection,
  zIndex
}: MobileFilterButtonTypes) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find((option) => option.value === selection)
  const selectedLabel = selectedOption?.label ?? selectedOption?.value ?? ''
  useEffect(() => {
    if (selection && onSelect) {
      onSelect(selection)
    }
  }, [selection, onSelect])

  const actions = options.map((option) => ({
    text: option.label ?? option.value,
    onClick: () => {
      setIsOpen(false)
      onSelect?.(option.value)
    }
  }))
  return (
    <Box>
      <Flex
        alignItems='center'
        justifyContent='center'
        border='strong'
        borderRadius='s'
        pt='s'
        pb='s'
        pl='m'
        pr='m'
        mt='m'
        gap='xs'
        onClick={() => setIsOpen((open) => !open)}
      >
        <Text variant='title' strength='weak' size='s'>
          {selectedLabel}
        </Text>
        <IconCaretDown size='s' color='default' />
      </Flex>
      <BottomSheetActionDrawer
        actions={actions}
        onClose={() => {
          setIsOpen(false)
          onClose?.()
        }}
        isOpen={isOpen}
        zIndex={zIndex}
        ariaLabel='Filter options'
      />
    </Box>
  )
}
