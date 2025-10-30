import { useContext, useEffect } from 'react'

import { Flex, IconWallet } from '@audius/harmony'
import { useTheme } from '@emotion/react'

import { Header } from 'components/header/desktop/Header'
import { useMobileHeader } from 'components/header/mobile/hooks'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, { LeftPreset } from 'components/nav/mobile/NavContext'
import Page from 'components/page/Page'
import { useIsMobile } from 'hooks/useIsMobile'
import { WalletCoinsList } from 'pages/wallet-page/components/WalletCoinsList'

import { LinkedWallets } from './components/LinkedWallets'

const messages = {
  title: 'Wallet'
}

export const WalletPage = () => {
  const isMobile = useIsMobile()
  const { spacing } = useTheme()

  const { setLeft } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.BACK)
  }, [setLeft])

  // Set up mobile header with icon
  useMobileHeader({
    title: messages.title
  })

  const header = <Header primary={messages.title} icon={IconWallet} />

  const content = (
    <Flex
      direction='column'
      gap='l'
      mb={isMobile ? undefined : 'xl'}
      mv={isMobile ? '3xl' : undefined}
      p={isMobile ? 'l' : undefined}
      w='100%'
      css={{
        '@media (min-width: 768px) and (max-width: 1024px)': {
          margin: '0 auto',
          marginBottom: spacing.xl
        }
      }}
    >
      <WalletCoinsList />
      <LinkedWallets />
    </Flex>
  )

  if (isMobile) {
    return (
      <MobilePageContainer
        title={messages.title}
        fullHeight
        containerClassName='wallet-page'
      >
        {content}
      </MobilePageContainer>
    )
  }

  return (
    <Page title={messages.title} header={header} contentClassName='wallet-page'>
      {content}
    </Page>
  )
}
