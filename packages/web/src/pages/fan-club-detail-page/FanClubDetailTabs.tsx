import { useCallback, useState } from 'react'

import { coinDetailsMessages } from '@audius/common/messages'
import { EDIT_COIN_DETAILS_PAGE } from '@audius/common/src/utils/route'
import { Button } from '@audius/harmony'
import { useNavigate } from 'react-router'

import useTabs from 'hooks/useTabs/useTabs'
import { AudioWalletTransactions } from 'pages/audio-page/AudioWalletTransactions'
import { env } from 'services/env'

import { FanClubDetailContent } from './FanClubDetailContent'

export enum FanClubDetailTabType {
  HOME = 'home',
  TRANSACTIONS = 'transactions'
}

const messages = {
  home: 'Home',
  transactions: 'Transactions',
  ...coinDetailsMessages
}

type UseFanClubDetailTabsProps = {
  mint: string
  ticker?: string
  isOwner?: boolean
}

export const useFanClubDetailTabs = ({
  mint,
  ticker,
  isOwner = false
}: UseFanClubDetailTabsProps) => {
  const [selectedTab, setSelectedTab] = useState(FanClubDetailTabType.HOME)
  const navigate = useNavigate()

  const handleTabChange = useCallback((_from: string, to: string) => {
    setSelectedTab(to as FanClubDetailTabType)
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
      label: FanClubDetailTabType.HOME
    },
    {
      text: messages.transactions,
      label: FanClubDetailTabType.TRANSACTIONS
    }
  ]

  const tabElements = [
    <FanClubDetailContent key='home' mint={mint} />,
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
      body: <FanClubDetailContent mint={mint} />,
      rightDecorator
    }
  }

  // For wAUDIO, return the full tabs system
  return {
    ...tabsResult
  }
}
