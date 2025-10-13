import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Coin } from '@audius/common/adapters'
import { makeLoadNextPage, useArtistCoins } from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import { useBuySellModal } from '@audius/common/store'
import {
  route,
  formatCurrencyWithSubscript,
  formatCount
} from '@audius/common/utils'
import {
  Button,
  Flex,
  IconSearch,
  Paper,
  Skeleton,
  spacing,
  Text
} from '@audius/harmony'
import { GetCoinsSortMethodEnum, GetCoinsSortDirectionEnum } from '@audius/sdk'
import moment from 'moment'
import { useNavigate } from 'react-router-dom-v5-compat'
import { Cell } from 'react-table'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { TextLink, UserLink } from 'components/link'
import { dateSorter, numericSorter, Table } from 'components/table'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { useMainContentRef } from 'pages/MainContentContext'
import { env } from 'services/env'

import styles from './ArtistCoinsTable.module.css'

type CoinCell = Cell<Coin>

const renderTokenNameCell = (cellInfo: CoinCell) => {
  const coin = cellInfo.row.original
  const { ownerId } = coin

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
          flex: '0 0 clamp(80px, 24ch, 180px)',
          minWidth: 'clamp(80px, 24ch, 180px)',
          maxWidth: 'clamp(80px, 24ch, 180px)'
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
      <Flex
        justifyContent='flex-start'
        css={{
          overflow: 'hidden',
          flex: '1 1 0',
          minWidth: '140px'
        }}
      >
        {ownerId ? (
          <UserLink
            userId={ownerId}
            size='s'
            badgeSize='xs'
            ellipses
            fullWidth
            hideArtistCoinBadge
            popover
          />
        ) : (
          <Skeleton h='24px' w='100px' />
        )}
      </Flex>
    </Flex>
  )
}

const renderPriceCell = (cellInfo: CoinCell) => {
  const coin = cellInfo.row.original
  const price =
    coin.price === 0 ? coin.dynamicBondingCurve.priceUSD : coin.price
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
      {formatCount(Math.round(coin.marketCap))}
    </Text>
  )
}

const renderVolume24hCell = (cellInfo: CoinCell) => {
  const coin = cellInfo.row.original
  return (
    <Text variant='body' size='m'>
      {walletMessages.dollarSign}
      {formatCount(coin.v24hUSD, 2)}
    </Text>
  )
}

const renderHoldersCell = (cellInfo: CoinCell) => {
  const coin = cellInfo.row.original
  return (
    <Text variant='body' size='m'>
      {formatCount(coin.holder)}
    </Text>
  )
}

const renderCreatedDateCell = (cellInfo: CoinCell) => {
  const coin = cellInfo.row.original
  return (
    <Text variant='body' size='m'>
      {moment(coin.createdAt).format('M/D/YY')}
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
    Header: () => <Flex css={{ paddingLeft: spacing.unit8 }}>Coin</Flex>,
    accessor: 'name',
    Cell: renderTokenNameCell,
    minWidth: 150,
    disableSortBy: true,
    align: 'left'
  },
  price: {
    id: 'price',
    Header: 'Price',
    accessor: 'price',
    Cell: renderPriceCell,
    disableSortBy: false,
    align: 'right',
    width: 50,
    minWidth: 50,
    sorter: numericSorter('price')
  },
  volume24h: {
    id: 'volume24h',
    Header: 'Vol',
    accessor: 'v24hUSD',
    Cell: renderVolume24hCell,
    disableSortBy: false,
    align: 'right',
    width: 40,
    minWidth: 40,
    sorter: numericSorter('v24hUSD')
  },
  marketCap: {
    id: 'marketCap',
    Header: 'Market Cap',
    accessor: 'marketCap',
    Cell: renderMarketCapCell,
    disableSortBy: false,
    align: 'right',
    width: 50,
    minWidth: 50,
    sorter: numericSorter('marketCap')
  },
  createdDate: {
    id: 'createdDate',
    Header: 'Launch',
    accessor: 'createdAt',
    Cell: renderCreatedDateCell,
    disableSortBy: false,
    align: 'right',
    width: 40,
    minWidth: 40,
    sorter: dateSorter('createdAt')
  },
  holders: {
    id: 'holders',
    Header: 'Holders',
    accessor: 'holder',
    Cell: renderHoldersCell,
    disableSortBy: false,
    align: 'right',
    width: 40,
    minWidth: 40,
    sorter: numericSorter('holder')
  },
  buy: {
    id: 'buy',
    accessor: 'buy',
    Cell: renderBuyCell,
    disableSortBy: true,
    align: 'right',
    width: 30,
    minWidth: 30
  }
}

const sortMethodMap: Record<string, GetCoinsSortMethodEnum> = {
  price: GetCoinsSortMethodEnum.Price,
  marketCap: GetCoinsSortMethodEnum.MarketCap,
  v24hUSD: GetCoinsSortMethodEnum.Volume,
  createdAt: GetCoinsSortMethodEnum.CreatedAt,
  holder: GetCoinsSortMethodEnum.Holder
}

const sortDirectionMap: Record<string, GetCoinsSortDirectionEnum> = {
  asc: GetCoinsSortDirectionEnum.Asc,
  desc: GetCoinsSortDirectionEnum.Desc
}

type ArtistCoinsTableProps = {
  searchQuery?: string
}

const ARTIST_COINS_BATCH_SIZE = 50

const isEmptyRow = (row: any) => {
  return Boolean(!row?.original || Object.keys(row.original).length === 0)
}

export const ArtistCoinsTable = ({ searchQuery }: ArtistCoinsTableProps) => {
  const mainContentRef = useMainContentRef()
  const navigate = useNavigate()
  const { onOpen: openBuySellModal } = useBuySellModal()
  const tableRef = useRef<HTMLDivElement | null>(null)
  const [hiddenColumns, setHiddenColumns] = useState<string[] | null>(null)
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

  const { data: coinsData, isPending } = queryResult
  const coins = useMemo(
    () => coinsData?.filter((coin) => coin.mint !== env.WAUDIO_MINT_ADDRESS),
    [coinsData]
  )

  const loadNextPage = useCallback(() => {
    makeLoadNextPage(queryResult)()
  }, [queryResult])

  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  const updateColumnVisibility = useCallback(() => {
    if (!tableRef.current) return
    const width = tableRef.current.offsetWidth
    if (width < 728) {
      setHiddenColumns([
        tableColumnMap.volume24h.id,
        tableColumnMap.marketCap.id,
        tableColumnMap.createdDate.id,
        tableColumnMap.holders.id
      ])
    } else if (width < 866) {
      setHiddenColumns([
        tableColumnMap.marketCap.id,
        tableColumnMap.createdDate.id,
        tableColumnMap.holders.id
      ])
    } else if (width < 972) {
      setHiddenColumns([
        tableColumnMap.createdDate.id,
        tableColumnMap.holders.id
      ])
    } else if (width < 1074) {
      setHiddenColumns([tableColumnMap.holders.id])
    } else {
      setHiddenColumns(null)
    }
  }, [])

  const setTableNode = useCallback(
    (node: HTMLDivElement | null) => {
      if (resizeObserverRef.current && tableRef.current) {
        resizeObserverRef.current.unobserve(tableRef.current)
      }
      tableRef.current = node
      if (!node) return

      if (!resizeObserverRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => {
          updateColumnVisibility()
        })
      }
      resizeObserverRef.current.observe(node)
      updateColumnVisibility()
    },
    [updateColumnVisibility]
  )

  useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
    }
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

  const handleBuy = useRequiresAccountCallback(
    (ticker: string) => {
      openBuySellModal({
        ticker,
        isOpen: true
      })
    },
    [openBuySellModal]
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
    return Object.values(baseColumns).filter(
      (column) => !hiddenColumns?.includes(column.id)
    )
  }, [handleBuy, hiddenColumns])

  const isEmpty = !coins || coins.length === 0
  if (isEmpty && !isPending) {
    return (
      <Paper
        column
        w='100%'
        justifyContent='center'
        alignItems='center'
        p='4xl'
        gap='l'
        border='default'
        borderRadius='m'
      >
        <IconSearch size='2xl' color='default' />
        <Text variant='heading' size='m'>
          {walletMessages.artistCoins.noCoins}
        </Text>
        <Text variant='body' size='l'>
          {walletMessages.artistCoins.noCoinsDescription}
        </Text>
      </Paper>
    )
  }

  return (
    <Flex ref={setTableNode} border='default' borderRadius='m'>
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
        tableHeaderClassName={styles.tableHeader}
        scrollRef={mainContentRef}
      />
    </Flex>
  )
}
