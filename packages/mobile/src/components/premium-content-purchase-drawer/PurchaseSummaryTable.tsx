import { PurchaseableContentType } from '@audius/common/store'
import { USDC } from '@audius/fixed-decimal'

import { Text } from 'app/components/core'

import { SummaryTable } from '../summary-table'
import type { SummaryTableItem } from '../summary-table/SummaryTable'

const messages = {
  summary: 'Total',
  payExtra: 'Pay Extra',
  premiumTrack: 'Premium Track',
  premiumAlbum: 'Premium Album',
  downloadableFiles: 'Downloadable Files',
  existingBalance: 'Existing Balance',
  total: 'Total',
  youPaid: 'You Paid',
  price: (price: string) => `$${price}`,
  subtractPrice: (price: string) => `-$${price}`,
  included: 'included'
}

type PurchaseSummaryTableProps = {
  contentType: PurchaseableContentType
  totalPriceInCents: number
  basePrice: number
  extraAmount?: number
  streamPurchaseCount?: number
  downloadPurchaseCount?: number
  stemsPurchaseCount?: number
}

export const PurchaseSummaryTable = ({
  contentType,
  totalPriceInCents,
  basePrice,
  extraAmount,
  streamPurchaseCount,
  downloadPurchaseCount,
  stemsPurchaseCount
}: PurchaseSummaryTableProps) => {
  const items: SummaryTableItem[] = []
  if (streamPurchaseCount) {
    if (contentType === PurchaseableContentType.TRACK) {
      items.push({
        id: messages.premiumTrack,
        label: messages.premiumTrack,
        value: messages.price(USDC(basePrice / 100).toLocaleString())
      })
    } else if (contentType === PurchaseableContentType.ALBUM) {
      items.push({
        id: messages.premiumAlbum,
        label: messages.premiumAlbum,
        value: messages.price(USDC(basePrice / 100).toLocaleString())
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
        : messages.price(USDC(basePrice / 100).toLocaleString()),
      color: streamPurchaseCount ? 'subdued' : 'default'
    })
  }

  if (extraAmount != null) {
    items.push({
      id: 'payExtra',
      label: messages.payExtra,
      value: messages.price(USDC(extraAmount / 100).toLocaleString())
    })
  }

  return (
    <SummaryTable
      collapsible
      title={messages.summary}
      secondaryTitle={
        <Text color='secondary' weight='bold'>
          {messages.price(USDC(totalPriceInCents / 100).toLocaleString())}
        </Text>
      }
      items={items}
    />
  )
}
