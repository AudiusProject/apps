import {
  useArtistCoinByTicker,
  useCurrentUserId,
  useUser
} from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { ASSET_DETAIL_PAGE } from '@audius/common/src/utils/route'
import { Flex, LoadingSpinner } from '@audius/harmony'
import { Redirect, useParams } from 'react-router-dom'

import { Header } from 'components/header/desktop/Header'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import Page from 'components/page/Page'
import { useIsMobile } from 'hooks/useIsMobile'
import { BASE_URL } from 'utils/route'

import { useAssetDetailTabs } from './AssetDetailTabs'

const messages = coinDetailsMessages.metaTags

type AssetDetailPageContentProps = {
  mint: string
  visualTitle: string
  ogTitle: string
  description: string
  isAnonymousUser: boolean
}

const DesktopAssetDetailPageContent = ({
  mint,
  visualTitle,
  ogTitle,
  description,
  ticker,
  isOwner,
  isAnonymousUser
}: AssetDetailPageContentProps & {
  ticker: string
  isOwner: boolean
  isAnonymousUser: boolean
}) => {
  const { tabs, body, rightDecorator } = useAssetDetailTabs({
    mint,
    ticker,
    isOwner,
    isAnonymousUser
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

const MobileAssetDetailPageContent = ({
  mint,
  visualTitle,
  ogTitle,
  description,
  isAnonymousUser
}: AssetDetailPageContentProps) => {
  const { body } = useAssetDetailTabs({ mint, isAnonymousUser })

  return (
    <MobilePageContainer
      title={visualTitle}
      ogTitle={ogTitle}
      description={description}
      canonicalUrl={`${BASE_URL}${ASSET_DETAIL_PAGE}/${visualTitle}`}
    >
      <Flex column w='100%' p='l'>
        {body}
      </Flex>
    </MobilePageContainer>
  )
}

export const AssetDetailPage = () => {
  const { ticker } = useParams<{ ticker: string }>()
  const isMobile = useIsMobile()
  const { data: currentUserId } = useCurrentUserId()

  const {
    data: coin,
    isPending: coinPending,
    isError,
    isSuccess
  } = useArtistCoinByTicker({ ticker })

  const { data: owner } = useUser(coin?.ownerId, {
    enabled: !!coin?.ownerId
  })

  if (!ticker || isError || (isSuccess && !coin)) {
    return <Redirect to='/coins' />
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
    <MobileAssetDetailPageContent
      mint={coin?.mint ?? ''}
      visualTitle={visualTitle}
      ogTitle={ogTitle}
      description={description ?? ''}
      isAnonymousUser={!currentUserId}
    />
  ) : (
    <DesktopAssetDetailPageContent
      mint={coin?.mint ?? ''}
      visualTitle={visualTitle}
      ogTitle={ogTitle}
      description={description ?? ''}
      ticker={coin?.ticker ?? ''}
      isOwner={isOwner}
      isAnonymousUser={!currentUserId}
    />
  )
}
