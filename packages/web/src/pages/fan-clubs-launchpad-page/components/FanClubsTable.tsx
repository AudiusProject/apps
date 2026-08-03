import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Coin } from '@audius/common/adapters'
import {
  makeLoadNextPage,
  useFanClubs,
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
  Skeleton,
  spacing,
  Text
} from '@audius/harmony'
import { GetCoinsSortMethodEnum, GetCoinsSortDirectionEnum } from '@audius/sdk'
import { useNavigate } from 'react-router'
import { Cell } from 'react-table'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import FilterInput from 'components/filter-input/FilterInput'
import { InfiniteCardLineup } from 'components/lineup/InfiniteCardLineup'
import { TextLink, UserLink } from 'components/link'
import { dateSorter, numericSorter, Table } from 'components/table'
import { RESPONSIVE_TABLE_POLICIES } from 'components/table/responsivePolicies'
import { useExternalWalletAddress } from 'hooks/useExternalWalletAddress'
import { useMainContentRef } from 'pages/MainContentContext'

import { FanClubCardSkeleton, FanClubCoinCard } from './FanClubCoinCard'
import styles from './FanClubsTable.module.css'

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

const renderTokenNameCell = (
  cellInfo: CoinCell,
  onViewCoin: (ticker: string) => void
) => {
  const coin = cellInfo.row.original

  if (!coin || !coin.ticker) {
    return null
  }

  const assetDetailUrl = route.coinPage(coin.ticker)
  const coinName = coin.name || coin.ticker

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
        <button
          type='button'
          className={styles.tokenIconButton}
          aria-label={`View ${coinName} fan club`}
          onClick={(e) => {
            e.stopPropagation()
            onViewCoin(coin.ticker ?? '')
          }}
        >
          <TokenIcon
            logoURI={coin.logoUri}
            size='xl'
            hex
            css={{ minWidth: spacing.unit10, minHeight: spacing.unit10 }}
          />
        </button>
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
      hideFanClubBadge
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
    width: 64,
    minWidth: 64,
    maxWidth: 64,
    disableResizing: true
  }
}

const sortMethodMap: Record<string, GetCoinsSortMethodEnum> = {
  price: GetCoinsSortMethodEnum.Price,
  marketCap: GetCoinsSortMethodEnum.MarketCap,
  createdAt: GetCoinsSortMethodEnum.CreatedAt,
  holder: GetCoinsSortMethodEnum.Holder
}

const sortDirectionMap: Record<string, GetCoinsSortDirectionEnum> = {
  asc: GetCoinsSortDirectionEnum.Asc,
  desc: GetCoinsSortDirectionEnum.Desc
}

type FanClubsTableProps = {
  viewMode: FanClubsViewMode
}

const FAN_CLUBS_BATCH_SIZE = 50

const isEmptyRow = (row: any) => {
  return Boolean(!row?.original || Object.keys(row.original).length === 0)
}

export const FanClubsTable = ({ viewMode }: FanClubsTableProps) => {
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
  const [sortSettings, setSortSettings] = useState({
    cards: {
      method: GetCoinsSortMethodEnum.Holder,
      direction: GetCoinsSortDirectionEnum.Desc
    },
    table: {
      method: GetCoinsSortMethodEnum.MarketCap,
      direction: GetCoinsSortDirectionEnum.Desc
    }
  })
  const sortMethod = sortSettings[viewMode].method
  const sortDirection = sortSettings[viewMode].direction
  const [searchValue, setSearchValue] = useState('')

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value),
    []
  )

  // Ref so the stable FilterHeader component can always call the latest handler
  const handleSearchChangeRef = useRef(handleSearchChange)
  useEffect(() => {
    handleSearchChangeRef.current = handleSearchChange
  }, [handleSearchChange])

  // Stable component reference — created once, never remounted on keystroke
  const FilterHeader = useMemo(() => {
    const Component = () => {
      const [value, setValue] = useState('')
      const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value)
        handleSearchChangeRef.current(e)
      }, [])
      return (
        <div className={styles.filterHeader}>
          <FilterInput placeholder='Filter' onChange={onChange} value={value} />
        </div>
      )
    }
    Component.displayName = 'FilterHeader'
    return Component
  }, [])

  const queryResult = useFanClubs({
    sortMethod,
    sortDirection,
    query: viewMode === 'table' ? searchValue || undefined : undefined,
    pageSize: FAN_CLUBS_BATCH_SIZE
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

  const onSort = useCallback(
    (method: string, direction: string) => {
      setSortSettings((prev) => ({
        ...prev,
        [viewMode]: {
          method: sortMethodMap[method] ?? prev[viewMode].method,
          direction: sortDirectionMap[direction] ?? prev[viewMode].direction
        }
      }))
    },
    [viewMode]
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

  const handleViewCoin = useCallback(
    (ticker: string) => {
      if (ticker) {
        navigate(route.coinPage(ticker))
      }
    },
    [navigate]
  )

  const columns = useMemo(() => {
    const baseColumns = { ...tableColumnMap }
    baseColumns.tokenName = {
      ...baseColumns.tokenName,
      Header: FilterHeader,
      Cell: (cellInfo: CoinCell) =>
        renderTokenNameCell(cellInfo, handleViewCoin)
    }
    baseColumns.buy = {
      ...baseColumns.buy,
      Cell: (cellInfo: CoinCell) => renderBuyCell(cellInfo, handleBuy)
    }
    return [
      baseColumns.tokenName,
      baseColumns.artist,
      baseColumns.price,
      baseColumns.marketCap,
      baseColumns.createdDate,
      baseColumns.holders,
      baseColumns.buy
    ]
  }, [handleBuy, handleViewCoin, FilterHeader])
  const cards = useMemo(
    () =>
      coins?.map((coin) => <FanClubCoinCard key={coin.mint} coin={coin} />) ??
      [],
    [coins]
  )

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
            {walletMessages.fanClubs.noCoins}
          </Text>
          <Text variant='body' size='l'>
            {walletMessages.fanClubs.noCoinsDescription}
          </Text>
        </Flex>
      ) : null}
      {!showEmptyState ? (
        <div className={styles.bodyWrapper}>
          {viewMode === 'table' ? (
            <Table
              columns={columns}
              data={coins ?? []}
              isVirtualized
              onSort={onSort}
              onClickRow={handleRowClick}
              loading={isPending}
              isEmptyRow={isEmptyRow}
              fetchMore={loadNextPage}
              fetchBatchSize={FAN_CLUBS_BATCH_SIZE}
              responsiveColumns={RESPONSIVE_TABLE_POLICIES.fanClubsLeaderboard}
              scrollRef={mainContentRef}
              wrapperClassName={styles.tableWrapper}
            />
          ) : isPending && cards.length === 0 ? (
            <div className={styles.cardsContainer}>
              {Array.from({ length: 12 }, (_, index) => (
                <FanClubCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <InfiniteCardLineup
              hasMore={hasNextPage ?? false}
              loadMore={handleCardLoadMore}
              cards={cards}
              cardsClassName={styles.cardsContainer}
              isLoadingMore={isFetchingNextPage}
            />
          )}
        </div>
      ) : null}
    </>
  )
}
