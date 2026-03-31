import {
  useArtistCoinByTicker,
  useCurrentUserId,
  useUser
} from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { coinPage } from '@audius/common/src/utils/route'
import { formatTickerForUrl, route } from '@audius/common/utils'
import { Flex, LoadingSpinner } from '@audius/harmony'
import { Navigate, useParams } from 'react-router'

import { Header } from 'components/header/desktop/Header'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import Page from 'components/page/Page'
import { useIsMobile } from 'hooks/useIsMobile'
import { BASE_URL } from 'utils/route'

import { useFanClubDetailTabs } from './FanClubDetailTabs'
import { MobileFanClubDetailContent } from './MobileFanClubDetailContent'

const { CLUBS_EXPLORE_PAGE, COIN_DETAIL_PAGE, NOT_FOUND_PAGE } = route

const messages = coinDetailsMessages.metaTags

type FanClubDetailPageContentProps = {
  mint: string
  visualTitle: string
  ogTitle: string
  description: string
}

const DesktopFanClubDetailPageContent = ({
  mint,
  visualTitle,
  ogTitle,
  description,
  ticker,
  isOwner
}: FanClubDetailPageContentProps & {
  ticker: string
  isOwner: boolean
}) => {
  const { tabs, body, rightDecorator } = useFanClubDetailTabs({
    mint,
    ticker,
    isOwner
  })

  const header = (
    <Header
      primary={visualTitle}
      showBackButton={true}
      bottomBar={tabs}
      rightDecorator={rightDecorator}
    />
  )

  return (
    <Page
      title={visualTitle}
      ogTitle={ogTitle}
      description={description}
      header={header}
    >
      {body}
    </Page>
  )
}

const MobileFanClubDetailPageContent = ({
  mint,
  visualTitle,
  ogTitle,
  description
}: FanClubDetailPageContentProps) => {
  return (
    <MobilePageContainer
      title={visualTitle}
      ogTitle={ogTitle}
      description={description}
      canonicalUrl={`${BASE_URL}${COIN_DETAIL_PAGE}/${visualTitle}`}
    >
      <MobileFanClubDetailContent mint={mint} />
    </MobilePageContainer>
  )
}

export const FanClubDetailPage = () => {
  const { ticker } = useParams<{ ticker?: string }>()
  const isMobile = useIsMobile()
  const { data: currentUserId } = useCurrentUserId()
  const formattedTicker = formatTickerForUrl(ticker ?? '')

  const {
    data: coin,
    isPending: coinPending,
    isError,
    isSuccess
  } = useArtistCoinByTicker({ ticker: formattedTicker })

  const { data: owner } = useUser(coin?.ownerId, {
    enabled: !!coin?.ownerId
  })

  if (!ticker) {
    return <Navigate to={CLUBS_EXPLORE_PAGE} replace />
  }

  if (ticker !== formattedTicker) {
    return <Navigate to={coinPage(formattedTicker)} replace />
  }

  if (isError || (isSuccess && !coin)) {
    return <Navigate to={NOT_FOUND_PAGE} replace />
  }

  if (coinPending) {
    return (
      <Flex
        justifyContent='center'
        alignItems='center'
        css={{ minHeight: '100vh' }}
      >
        <LoadingSpinner />
      </Flex>
    )
  }

  const isOwner = currentUserId === coin?.ownerId

  // Visual title is just the coin name for the header
  const visualTitle = coin?.name ?? ''
  // OG title includes the ticker for meta tags
  const ogTitle = messages.getTitle(coin?.name, coin?.ticker)
  const description = messages.getDescription(
    coin?.name,
    coin?.ticker,
    owner?.handle
  )

  return isMobile ? (
    <MobileFanClubDetailPageContent
      mint={coin?.mint ?? ''}
      visualTitle={visualTitle}
      ogTitle={ogTitle}
      description={description ?? ''}
    />
  ) : (
    <DesktopFanClubDetailPageContent
      mint={coin?.mint ?? ''}
      visualTitle={visualTitle}
      ogTitle={ogTitle}
      description={description ?? ''}
      ticker={coin?.ticker ?? ''}
      isOwner={isOwner}
    />
  )
}
