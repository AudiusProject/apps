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
  title: string
  description: string
  isAnonymousUser: boolean
}

const DesktopAssetDetailPageContent = ({
  mint,
  title,
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
      primary={title}
      showBackButton={true}
      bottomBar={tabs}
      rightDecorator={rightDecorator}
    />
  )

  return (
    <Page title={title} description={description} header={header}>
      {body}
    </Page>
  )
}

const MobileAssetDetailPageContent = ({
  mint,
  title,
  description,
  isAnonymousUser
}: AssetDetailPageContentProps) => {
  const { body } = useAssetDetailTabs({ mint, isAnonymousUser })

  return (
    <MobilePageContainer
      title={title}
      description={description}
      canonicalUrl={`${BASE_URL}${ASSET_DETAIL_PAGE}/${title}`}
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

  // Format title and description for SEO
  const title = messages.getTitle(coin?.name, coin?.ticker)
  const description = messages.getDescription(
    coin?.name,
    coin?.ticker,
    owner?.handle
  )

  return isMobile ? (
    <MobileAssetDetailPageContent
      mint={coin?.mint ?? ''}
      title={title}
      description={description ?? ''}
      isAnonymousUser={!currentUserId}
    />
  ) : (
    <DesktopAssetDetailPageContent
      mint={coin?.mint ?? ''}
      title={title}
      description={description ?? ''}
      ticker={coin?.ticker ?? ''}
      isOwner={isOwner}
      isAnonymousUser={!currentUserId}
    />
  )
}
