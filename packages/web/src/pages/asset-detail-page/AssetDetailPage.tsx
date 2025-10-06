import { useArtistCoinByTicker, useCurrentUserId } from '@audius/common/api'
import { ASSET_DETAIL_PAGE } from '@audius/common/src/utils/route'
import { Flex, LoadingSpinner } from '@audius/harmony'
import { Redirect, useParams } from 'react-router-dom'

import { Header } from 'components/header/desktop/Header'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import Page from 'components/page/Page'
import { useIsMobile } from 'hooks/useIsMobile'
import { BASE_URL } from 'utils/route'

import { useAssetDetailTabs } from './AssetDetailTabs'

type AssetDetailPageContentProps = {
  mint: string
  title: string
  isAnonymousUser: boolean
}

const DesktopAssetDetailPageContent = ({
  mint,
  title,
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
    <Page title={title} header={header}>
      {body}
    </Page>
  )
}

const MobileAssetDetailPageContent = ({
  mint,
  title,
  isAnonymousUser
}: AssetDetailPageContentProps) => {
  const { body } = useAssetDetailTabs({ mint, isAnonymousUser })

  return (
    <MobilePageContainer
      title={title}
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
    isPending,
    isError,
    isSuccess
  } = useArtistCoinByTicker({ ticker })

  if (!ticker || isError || (isSuccess && !coin)) {
    return <Redirect to='/coins' />
  }

  if (isPending) {
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

  return isMobile ? (
    <MobileAssetDetailPageContent
      mint={coin?.mint ?? ''}
      title={coin?.ticker ?? ''}
      isAnonymousUser={!currentUserId}
    />
  ) : (
    <DesktopAssetDetailPageContent
      mint={coin?.mint ?? ''}
      title={coin?.name ?? ''}
      ticker={coin?.ticker ?? ''}
      isOwner={isOwner}
      isAnonymousUser={!currentUserId}
    />
  )
}
