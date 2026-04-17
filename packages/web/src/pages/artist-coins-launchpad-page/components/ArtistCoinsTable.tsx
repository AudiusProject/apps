import { useCallback, useMemo, useRef, useState } from 'react'

import { Coin } from '@audius/common/adapters'
import {
  makeLoadNextPage,
  useArtistCoins,
  useExternalWalletBalance,
  useQueryContext
} from '@audius/common/api'
import { useBuySellInitialTab } from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { useBuySellModal } from '@audius/common/store'
import {
  route,
  formatCurrencyWithSubscript,
  formatCount,
  dayjs
} from '@audius/common/utils'
import {
  Button,
  Flex,
  IconSearch,
  LoadingSpinner,
  Skeleton,
  spacing,
  Text
} from '@audius/harmony'
import { GetCoinsSortMethodEnum, GetCoinsSortDirectionEnum } from '@audius/sdk'
import InfiniteScroll from 'react-infinite-scroller'
import { useNavigate } from 'react-router'
import { Cell } from 'react-table'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { TextLink, UserLink } from 'components/link'
import { dateSorter, numericSorter, Table } from 'components/table'
import { RESPONSIVE_TABLE_POLICIES } from 'components/table/responsivePolicies'
import { useExternalWalletAddress } from 'hooks/useExternalWalletAddress'
import { useMainContentRef } from 'pages/MainContentContext'
import { getScrollParent } from 'utils/scrollParent'

import { FanClubCardSkeleton, FanClubCoinCard } from './FanClubCoinCard'

export const FAN_CLUBS_VIEW_STORAGE_KEY = 'audius:fan-clubs-explore-view'

export type FanClubsViewMode = 'table' | 'cards'

export const readInitialFanClubsViewMode = (): FanClubsViewMode => {
  if (typeof window === 'undefined') {
    return 'cards'
  }
  const stored = window.localStorage.getItem(FAN_CLUBS_VIEW_STORAGE_KEY)
  if (stored === 'table') {
    return 'table'
  }
  if (stored === 'cards') {
    return 'cards'
  }
  return 'cards'
}

type CoinCell = Cell<Coin>

const renderTokenNameCell = (cellInfo: CoinCell) => {
  const coin = cellInfo.row.original

  if (!coin || !coin.ticker) {
    return null
  }

  const assetDetailUrl = route.coinPage(coin.ticker)

  return (
    <Flex
      pl='xl'
      gap='l'
      alignItems='center'
      justifyContent='flex-start'
      w='100%'
    >
      <Flex justifyContent='flex-end' css={{ flex: '0 0 2ch' }}>
        <Text
          variant='body'
          size='s'
          strength='strong'
          css={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {cellInfo.row.index + 1}
        </Text>
      </Flex>
      <Flex
        gap='m'
        alignItems='center'
        css={{
          overflow: 'hidden',
          flex: '1 1 0',
          minWidth: 0
        }}
      >
        <TokenIcon
          logoURI={coin.logoUri}
          size='xl'
          hex
          css={{ minWidth: spacing.unit10, minHeight: spacing.unit10 }}
        />
        <Flex column css={{ overflow: 'hidden' }}>
          <TextLink
            to={assetDetailUrl}
            textVariant='title'
            size='s'
            ellipses
            css={{ display: 'block' }}
          >
            {coin.name}
          </TextLink>
          <TextLink
            to={assetDetailUrl}
            textVariant='body'
            size='s'
            strength='strong'
            ellipses
            css={{ display: 'block' }}
          >
            ${coin.ticker}
          </TextLink>
        </Flex>
      </Flex>
    </Flex>
  )
}

const renderArtistCell = (cellInfo: CoinCell) => {
  const coin = cellInfo.row.original
  const { ownerId } = coin

  if (!ownerId) {
    return <Skeleton h='24px' w='100px' />
  }

  return (
    <UserLink
      userId={ownerId}
      size='s'
      badgeSize='xs'
      ellipses
      fullWidth
      hideArtistCoinBadge
      popover
    />
  )
}

const renderPriceCell = (cellInfo: CoinCell) => {
  const coin = cellInfo.row.original
  const price =
    (coin.price === 0 ? coin.dynamicBondingCurve?.priceUSD : coin.price) ?? 0
  return (
    <Text variant='body' size='m'>
      {formatCurrencyWithSubscript(price)}
    </Text>
  )
}

const renderMarketCapCell = (cellInfo: CoinCell) => {
  const coin = cellInfo.row.original
  return (
    <Text variant='body' size='m'>
      {walletMessages.dollarSign}
      {formatCount(Math.round(coin.marketCap ?? 0))}
    </Text>
  )
}

const renderTotalVolumeUSDCell = (cellInfo: CoinCell) => {
  const coin = cellInfo.row.original
  return (
    <Text variant='body' size='m'>
      {walletMessages.dollarSign}
      {formatCount(coin.totalVolumeUSD ?? 0, 2)}
    </Text>
  )
}

const renderHoldersCell = (cellInfo: CoinCell) => {
  const coin = cellInfo.row.original
  return (
    <Text variant='body' size='m'>
      {formatCount(coin.holder ?? 0)}
    </Text>
  )
}

const renderCreatedDateCell = (cellInfo: CoinCell) => {
  const coin = cellInfo.row.original
  return (
    <Text variant='body' size='m'>
      {dayjs(coin.createdAt).format('M/D/YY')}
    </Text>
  )
}

const renderBuyCell = (
  cellInfo: CoinCell,
  handleBuy: (ticker: string) => void
) => {
  const coin = cellInfo.row.original

  return (
    <Flex pr='s' justifyContent='flex-end'>
      <Button
        variant='secondary'
        size='small'
        hoverColor='coinGradient'
        onClick={(e) => {
          e.stopPropagation()
          handleBuy(coin.ticker ?? '')
        }}
      >
        {walletMessages.buy}
      </Button>
    </Flex>
  )
}

const tableColumnMap = {
  tokenName: {
    id: 'tokenName',
    Header: () => <Flex css={{ paddingLeft: 24 }}>Coin</Flex>,
    accessor: 'name',
    Cell: renderTokenNameCell,
    minWidth: 220,
    width: 220,
    maxWidth: Number.MAX_SAFE_INTEGER,
    disableSortBy: true,
    align: 'left'
  },
  artist: {
    id: 'artist',
    Header: () => <Flex css={{ paddingLeft: 0 }}>Artist</Flex>,
    accessor: 'ownerId',
    Cell: renderArtistCell,
    minWidth: 140,
    width: 140,
    maxWidth: 140,
    disableSortBy: true,
    disableResizing: true,
    align: 'left'
  },
  price: {
    id: 'price',
    Header: 'Price',
    accessor: 'price',
    Cell: renderPriceCell,
    disableSortBy: false,
    align: 'right',
    width: 104,
    minWidth: 104,
    maxWidth: 104,
    disableResizing: true,
    sorter: numericSorter('price')
  },
  totalVolumeUSD: {
    id: 'totalVolumeUSD',
    Header: 'Vol',
    accessor: 'totalVolumeUSD',
    Cell: renderTotalVolumeUSDCell,
    disableSortBy: false,
    align: 'right',
    width: 120,
    minWidth: 120,
    maxWidth: 120,
    disableResizing: true,
    sorter: numericSorter('totalVolumeUSD')
  },
  marketCap: {
    id: 'marketCap',
    Header: 'Market Cap',
    accessor: 'marketCap',
    Cell: renderMarketCapCell,
    disableSortBy: false,
    align: 'right',
    width: 120,
    minWidth: 120,
    maxWidth: 120,
    disableResizing: true,
    sorter: numericSorter('marketCap')
  },
  createdDate: {
    id: 'createdDate',
    Header: 'Launch',
    accessor: 'createdAt',
    Cell: renderCreatedDateCell,
    disableSortBy: false,
    align: 'right',
    width: 104,
    minWidth: 104,
    maxWidth: 104,
    disableResizing: true,
    sorter: dateSorter('createdAt')
  },
  holders: {
    id: 'holders',
    Header: 'Holders',
    accessor: 'holder',
    Cell: renderHoldersCell,
    disableSortBy: false,
    align: 'right',
    width: 88,
    minWidth: 88,
    maxWidth: 88,
    disableResizing: true,
    sorter: numericSorter('holder')
  },
  buy: {
    id: 'buy',
    accessor: 'buy',
    Cell: renderBuyCell,
    disableSortBy: true,
    align: 'right',
    width: 112,
    minWidth: 112,
    maxWidth: 112,
    disableResizing: true
  }
}

const sortMethodMap: Record<string, GetCoinsSortMethodEnum> = {
  price: GetCoinsSortMethodEnum.Price,
  marketCap: GetCoinsSortMethodEnum.MarketCap,
  totalVolumeUSD: GetCoinsSortMethodEnum.Volume,
  createdAt: GetCoinsSortMethodEnum.CreatedAt,
  holder: GetCoinsSortMethodEnum.Holder
}

const sortDirectionMap: Record<string, GetCoinsSortDirectionEnum> = {
  asc: GetCoinsSortDirectionEnum.Asc,
  desc: GetCoinsSortDirectionEnum.Desc
}

type ArtistCoinsTableProps = {
  searchQuery?: string
  viewMode: FanClubsViewMode
}

const ARTIST_COINS_BATCH_SIZE = 50

const isEmptyRow = (row: any) => {
  return Boolean(!row?.original || Object.keys(row.original).length === 0)
}

export const ArtistCoinsTable = ({
  searchQuery,
  viewMode
}: ArtistCoinsTableProps) => {
  const mainContentRef = useMainContentRef()
  const navigate = useNavigate()
  const { onOpen: openBuySellModal } = useBuySellModal()
  const { env } = useQueryContext()
  const externalWalletAddress = useExternalWalletAddress()
  const { data: externalUsdcBalance } = useExternalWalletBalance({
    mint: env.USDC_MINT_ADDRESS,
    walletAddress: externalWalletAddress
  })
  const { data: externalAudioBalance } = useExternalWalletBalance({
    mint: env.WAUDIO_MINT_ADDRESS,
    walletAddress: externalWalletAddress
  })
  const initialTab = useBuySellInitialTab({
    externalUsdcBalance,
    externalAudioBalance
  })
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [sortMethod, setSortMethod] = useState<GetCoinsSortMethodEnum>(
    GetCoinsSortMethodEnum.MarketCap
  )
  const [sortDirection, setSortDirection] = useState<GetCoinsSortDirectionEnum>(
    GetCoinsSortDirectionEnum.Desc
  )

  const queryResult = useArtistCoins({
    sortMethod,
    sortDirection,
    query: searchQuery,
    pageSize: ARTIST_COINS_BATCH_SIZE
  })

  const {
    data: coinsData,
    isPending,
    hasNextPage,
    isFetchingNextPage
  } = queryResult
  const coins = useMemo(
    () => coinsData?.filter((coin) => coin.mint !== env.WAUDIO_MINT_ADDRESS),
    [coinsData, env.WAUDIO_MINT_ADDRESS]
  )

  const loadNextPage = useCallback(() => {
    makeLoadNextPage(queryResult)()
  }, [queryResult])

  const handleCardLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      loadNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, loadNextPage])

  const getScrollableParent = useCallback(() => {
    const mainEl = mainContentRef.current
    if (mainEl) {
      return mainEl
    }
    if (!scrollContainerRef.current) {
      return null
    }
    return (getScrollParent(scrollContainerRef.current) as HTMLElement) ?? null
  }, [mainContentRef])

  const setTableNode = useCallback((node: HTMLDivElement | null) => {
    scrollContainerRef.current = node
  }, [])

  const onSort = useCallback(
    (method: string, direction: string) => {
      const newSortMethod = sortMethodMap[method] ?? sortMethod
      const newSortDirection = sortDirectionMap[direction] ?? sortDirection

      setSortMethod(newSortMethod)
      setSortDirection(newSortDirection)
    },
    [sortMethod, sortDirection]
  )

  const handleBuy = useCallback(
    (ticker: string) => {
      openBuySellModal({
        ticker,
        initialTab,
        isOpen: true
      })
    },
    [openBuySellModal, initialTab]
  )

  const handleRowClick = useCallback(
    (e: React.MouseEvent<HTMLTableRowElement>, rowInfo: any) => {
      const coin = rowInfo.original
      if (coin?.ticker) {
        navigate(route.coinPage(coin.ticker))
      }
    },
    [navigate]
  )

  const columns = useMemo(() => {
    const baseColumns = { ...tableColumnMap }
    baseColumns.buy = {
      ...baseColumns.buy,
      Cell: (cellInfo: CoinCell) => renderBuyCell(cellInfo, handleBuy)
    }
    return [
      baseColumns.tokenName,
      baseColumns.artist,
      baseColumns.price,
      baseColumns.totalVolumeUSD,
      baseColumns.marketCap,
      baseColumns.createdDate,
      baseColumns.holders,
      baseColumns.buy
    ]
  }, [handleBuy])

  const showEmptyState = !isPending && (!coins || coins.length === 0)

  return (
    <>
      {showEmptyState ? (
        <Flex
          column
          w='100%'
          justifyContent='center'
          alignItems='center'
          p='4xl'
          gap='l'
        >
          <IconSearch size='2xl' color='default' />
          <Text variant='heading' size='m'>
            {walletMessages.artistCoins.noCoins}
          </Text>
          <Text variant='body' size='l'>
            {walletMessages.artistCoins.noCoinsDescription}
          </Text>
        </Flex>
      ) : null}
      {!showEmptyState && viewMode === 'table' ? (
        <Flex
          ref={setTableNode}
          direction='column'
          w='100%'
          border='default'
          borderRadius='m'
          backgroundColor='surface1'
          css={{ overflow: 'hidden' }}
        >
          <Table
            columns={columns}
            data={coins ?? []}
            isVirtualized
            onSort={onSort}
            onClickRow={handleRowClick}
            loading={isPending}
            isEmptyRow={isEmptyRow}
            fetchMore={loadNextPage}
            fetchBatchSize={ARTIST_COINS_BATCH_SIZE}
            responsiveColumns={RESPONSIVE_TABLE_POLICIES.artistCoinsLeaderboard}
            scrollRef={mainContentRef}
          />
        </Flex>
      ) : null}
      {!showEmptyState && viewMode === 'cards' ? (
        <Flex ref={setTableNode} direction='column' w='100%'>
          {isPending && (!coins || coins.length === 0) ? (
            <Flex
              w='100%'
              css={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: spacing.m
              }}
            >
              {Array.from({ length: 6 }, (_, index) => (
                <FanClubCardSkeleton key={index} />
              ))}
            </Flex>
          ) : (
            <InfiniteScroll
              hasMore={hasNextPage ?? false}
              loadMore={handleCardLoadMore}
              getScrollParent={getScrollableParent}
              useWindow={false}
            >
              <Flex
                w='100%'
                css={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: spacing.m
                }}
              >
                {coins?.map((coin) => (
                  <FanClubCoinCard key={coin.mint} coin={coin} />
                ))}
              </Flex>
              {isFetchingNextPage ? (
                <Flex justifyContent='center' p='l'>
                  <LoadingSpinner css={{ width: 24, height: 24 }} />
                </Flex>
              ) : null}
            </InfiniteScroll>
          )}
        </Flex>
      ) : null}
    </>
  )
}
