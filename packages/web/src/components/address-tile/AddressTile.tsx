import { useCallback, useContext } from 'react'

import { shortenSPLAddress } from '@audius/common/utils'
import {
  Text,
  IconCopy,
  PlainButton,
  IconComponent,
  Flex,
  Box
} from '@audius/harmony'

import { ToastContext } from 'components/toast/ToastContext'
import { useIsMobile } from 'hooks/useIsMobile'
import { copyToClipboard } from 'utils/clipboardUtil'

const messages = {
  copied: 'Copied to Clipboard!'
}

type AddressTileProps = {
  address?: string
  iconRight?: IconComponent
  shorten?: boolean
  shortenLength?: number
}

export const AddressTile = ({
  address,
  iconRight: IconRight,
  shorten = false,
  shortenLength = 12
}: AddressTileProps) => {
  const { toast } = useContext(ToastContext)
  const isMobile = useIsMobile()

  const handleCopyPress = useCallback(() => {
    if (address) {
      copyToClipboard(address)
      toast(messages.copied)
    }
  }, [address, toast])

  const defaultRight = (
    <PlainButton onClick={handleCopyPress}>
      <IconCopy size='s' color='subdued' />
    </PlainButton>
  )

  if (!address) {
    return null
  }

  return (
    <Flex column border='default' borderRadius='s' w='100%'>
      <Flex
        backgroundColor='surface1'
        alignItems='stretch'
        justifyContent='space-between'
        borderBottomLeftRadius='s'
        borderBottomRightRadius='s'
      >
        <Box
          p='l'
          borderRadius='s'
          w='100%'
          css={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          <Text
            css={{
              userSelect: 'text',
              lineHeight: '125%'
            }}
            variant='body'
          >
            {isMobile || shorten
              ? shortenSPLAddress(address, shortenLength)
              : address}
          </Text>
        </Box>
        <Flex alignItems='center' borderLeft='default' ph='l'>
          {IconRight ? <IconRight /> : defaultRight}
        </Flex>
      </Flex>
    </Flex>
  )
}
