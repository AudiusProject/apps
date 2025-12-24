import { useCallback } from 'react'

import { APP_REDIRECT } from '@audius/common/src/utils/route'
import { Box, Button, Flex, Text } from '@audius/harmony'
import { useLocation } from 'react-router'

import Drawer from 'components/drawer/Drawer'
import { getPathname } from 'utils/route'
import { zIndex } from 'utils/zIndex'

type OpenAppDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

const messages = {
  openTheApp: 'Open The App',
  drawerDescription:
    "You'll need to make this purchase in the app or on the web."
}

export const OpenAppDrawer = ({ isOpen, onClose }: OpenAppDrawerProps) => {
  const location = useLocation()

  const handleOpenAppClick = useCallback(() => {
    const pathname = getPathname(location)
    const redirectHref = `https://redirect.audius.co${APP_REDIRECT}${pathname}`
    window.location.href = redirectHref
  }, [location])

  return (
    <Drawer
      zIndex={zIndex.BUY_SELL_MODAL}
      isOpen={isOpen}
      onClose={onClose}
      shouldClose={!isOpen}
    >
      <Flex direction='column' p='l' pb='2xl' w='100%'>
        <Box pv='s'>
          <Text
            variant='label'
            size='xl'
            strength='strong'
            color='subdued'
            textAlign='center'
          >
            {messages.openTheApp}
          </Text>
        </Box>
        <Box pv='l'>
          <Text>{messages.drawerDescription}</Text>
        </Box>
        <Button variant='secondary' onClick={handleOpenAppClick}>
          {messages.openTheApp}
        </Button>
      </Flex>
    </Drawer>
  )
}
