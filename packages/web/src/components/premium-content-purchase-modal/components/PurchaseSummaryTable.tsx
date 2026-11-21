import { USDC } from '@audius/fixed-decimal'
import { Text } from '@audius/harmony'

import { SummaryTable, SummaryTableItem } from 'components/summary-table'

const messages = {
  summary: 'Transaction Summary',
  premiumAlbum: 'Premium Album',
  premiumTrack: 'Premium Track',
  downloadableFiles: 'Downloadable Files',
  payExtra: 'Pay Extra',
  total: 'Total',
  youPaid: 'You Paid',
  zero: '$0.00',
  included: 'included'
}

type PurchaseSummaryTableProps = {
  totalPriceInCents: number
  basePrice: number
  extraAmount?: number
  streamPurchaseCount?: number
  downloadPurchaseCount?: number
  stemsPurchaseCount?: number
  isAlbumPurchase?: boolean
}

export const PurchaseSummaryTable = ({
  totalPriceInCents,
  basePrice,
  extraAmount,
  streamPurchaseCount,
  downloadPurchaseCount,
  stemsPurchaseCount,
  isAlbumPurchase
}: PurchaseSummaryTableProps) => {
  const items: SummaryTableItem[] = []
  if (streamPurchaseCount) {
    if (isAlbumPurchase) {
      items.push({
        id: 'premiumAlbum',
        label: messages.premiumAlbum,
        value: USDC(basePrice / 100).toLocaleString()
      })
    } else {
      items.push({
        id: 'premiumTrack',
        label: messages.premiumTrack,
        value: USDC(basePrice / 100).toLocaleString()
      })
    }
  }
  const downloadCount = (stemsPurchaseCount ?? 0) + (downloadPurchaseCount ?? 0)
  if (downloadCount > 0) {
    items.push({
      id: 'premiumTrackDownload',
      label: `${messages.downloadableFiles} (${downloadCount})`,
      value: streamPurchaseCount
        ? messages.included
        : USDC(basePrice / 100).toLocaleString(),
      color: streamPurchaseCount ? 'subdued' : 'default'
    })
  }

  if (extraAmount != null) {
    items.push({
      id: 'payExtra',
      label: messages.payExtra,
      value: USDC(extraAmount / 100).toLocaleString()
    })
  }

  return (
    <SummaryTable
      items={items}
      title={messages.total}
      collapsible
      secondaryTitle={
        <Text tag='span' color='accent'>
          {USDC(totalPriceInCents / 100).toLocaleString()}
        </Text>
      }
    />
  )
}
