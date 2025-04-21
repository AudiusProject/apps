import { Flex, IconWallet } from '@audius/harmony'
import { useTheme } from '@emotion/react'

import { Header } from 'components/header/desktop/Header'
import { useMobileHeader } from 'components/header/mobile/hooks'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import Page from 'components/page/Page'
import { useIsMobile } from 'hooks/useIsMobile'
import { CashWallet } from 'pages/pay-and-earn-page/components/CashWallet'
import { YourCoins } from 'pages/pay-and-earn-page/components/YourCoins'

const messages = {
  title: 'Wallet'
}

export const WalletPage = () => {
  const isMobile = useIsMobile()
  const { spacing } = useTheme()

  // Set up mobile header with icon
  useMobileHeader({
    title: messages.title
  })

  const header = <Header primary={messages.title} icon={IconWallet} />

  const content = (
    <Flex
      direction='column'
      gap='l'
      mb='xl'
      w='100%'
      css={{
        '@media (min-width: 768px) and (max-width: 1024px)': {
          maxWidth: '90%',
          margin: '0 auto',
          marginBottom: spacing.xl
        }
      }}
    >
      <CashWallet />
      <YourCoins />
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
