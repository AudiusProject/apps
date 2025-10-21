import { useCallback, useState } from 'react'

import { coinDetailsMessages } from '@audius/common/messages'
import { EDIT_COIN_DETAILS_PAGE } from '@audius/common/src/utils/route'
import { Button } from '@audius/harmony'
import { useNavigate } from 'react-router-dom-v5-compat'

import useTabs from 'hooks/useTabs/useTabs'
import { AudioWalletTransactions } from 'pages/audio-page/AudioWalletTransactions'
import { env } from 'services/env'

import { AssetDetailContent } from './AssetDetailContent'

export enum AssetDetailTabType {
  HOME = 'home',
  TRANSACTIONS = 'transactions'
}

const messages = {
  home: 'Home',
  transactions: 'Transactions',
  ...coinDetailsMessages
}

type UseAssetDetailTabsProps = {
  mint: string
  ticker?: string
  isOwner?: boolean
}

export const useAssetDetailTabs = ({
  mint,
  ticker,
  isOwner = false
}: UseAssetDetailTabsProps) => {
  const [selectedTab, setSelectedTab] = useState(AssetDetailTabType.HOME)
  const navigate = useNavigate()

  const handleTabChange = useCallback((_from: string, to: string) => {
    setSelectedTab(to as AssetDetailTabType)
  }, [])

  const handleEditClick = useCallback(() => {
    if (ticker) {
      navigate(EDIT_COIN_DETAILS_PAGE.replace(':ticker', ticker))
    }
  }, [ticker, navigate])

  const isWAudio = mint === env.WAUDIO_MINT_ADDRESS

  // For wAUDIO, show both tabs
  const tabs = [
    {
      text: messages.home,
      label: AssetDetailTabType.HOME
    },
    {
      text: messages.transactions,
      label: AssetDetailTabType.TRANSACTIONS
    }
  ]

  const tabElements = [
    <AssetDetailContent key='home' mint={mint} />,
    <AudioWalletTransactions key='transactions' />
  ]

  const tabsResult = useTabs({
    isMobile: false,
    tabs,
    selectedTabLabel: selectedTab,
    elements: tabElements,
    didChangeTabsFrom: handleTabChange
  })

  const rightDecorator = isOwner ? (
    <Button variant='secondary' size='small' onClick={handleEditClick}>
      {messages.coinInsights.edit}
    </Button>
  ) : null

  // If not wAUDIO, just return the content without tabs
  if (!isWAudio) {
    return {
      tabs: null,
      body: <AssetDetailContent mint={mint} />,
      rightDecorator
    }
  }

  // For wAUDIO, return the full tabs system
  return {
    ...tabsResult
  }
}
