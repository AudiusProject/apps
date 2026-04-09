import { useCallback, useState } from 'react'

import {
  useFanClub,
  useCoinBalance,
  useCurrentUserId
} from '@audius/common/api'
import { Flex, Text, useTheme } from '@audius/harmony'

import { BalanceSection } from './components/BalanceSection'
import { FanClubFeedSection } from './components/FanClubFeedSection'
import { FanClubInfoSection } from './components/FanClubInfoSection'
import { FanClubInsights } from './components/FanClubInsights'
import { FanClubLeaderboardCard } from './components/FanClubLeaderboardCard'
import { PostUpdateCard } from './components/PostUpdateCard'

enum TabType {
  FAN_CLUB = 'fanClub',
  COIN = 'coin'
}

const messages = {
  fanClub: 'Fan Club',
  coin: 'Coin'
}

type TabButtonProps = {
  label: string
  isActive: boolean
  onClick: () => void
}

const TabButton = ({ label, isActive, onClick }: TabButtonProps) => {
  const { color, spacing } = useTheme()

  return (
    <Flex
      onClick={onClick}
      justifyContent='center'
      alignItems='center'
      css={{
        flex: 1,
        cursor: 'pointer',
        height: spacing.unit10,
        borderBottom: `2px solid ${isActive ? color.primary.primary : 'transparent'}`,
        transition: 'border-color 0.2s ease'
      }}
    >
      <Text
        variant='body'
        strength={isActive ? 'strong' : 'default'}
        color={isActive ? 'default' : 'subdued'}
      >
        {label}
      </Text>
    </Flex>
  )
}

type MobileFanClubTabBarProps = {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const MobileFanClubTabBar = ({
  activeTab,
  onTabChange
}: MobileFanClubTabBarProps) => {
  const { color } = useTheme()

  return (
    <Flex
      w='100%'
      css={{
        borderBottom: `1px solid ${color.border.default}`,
        backgroundColor: color.background.white
      }}
    >
      <TabButton
        label={messages.fanClub}
        isActive={activeTab === TabType.FAN_CLUB}
        onClick={() => onTabChange(TabType.FAN_CLUB)}
      />
      <TabButton
        label={messages.coin}
        isActive={activeTab === TabType.COIN}
        onClick={() => onTabChange(TabType.COIN)}
      />
    </Flex>
  )
}

type FanClubTabContentProps = {
  mint: string
}

const FanClubTabContent = ({ mint }: FanClubTabContentProps) => {
  const { data: coin } = useFanClub(mint)
  const { data: currentUserId } = useCurrentUserId()
  const { data: tokenBalance } = useCoinBalance({ mint })

  const isOwner = currentUserId != null && currentUserId === coin?.ownerId
  const hasBalance = !!(
    tokenBalance?.balance && Number(tokenBalance.balance.toString()) > 0
  )
  const isMemberOrOwner = isOwner || hasBalance

  return (
    <Flex column gap='l' w='100%' p='l'>
      <FanClubInfoSection mint={mint} variant='hero' />
      <PostUpdateCard mint={mint} />
      <BalanceSection mint={mint} />
      {isMemberOrOwner ? <FanClubLeaderboardCard mint={mint} /> : null}
      <FanClubFeedSection mint={mint} />
    </Flex>
  )
}

type CoinTabContentProps = {
  mint: string
}

const CoinTabContent = ({ mint }: CoinTabContentProps) => {
  return (
    <Flex column gap='l' w='100%' p='l'>
      <BalanceSection mint={mint} />
      <FanClubInsights mint={mint} />
    </Flex>
  )
}

type MobileFanClubDetailContentProps = {
  mint: string
}

export const MobileFanClubDetailContent = ({
  mint
}: MobileFanClubDetailContentProps) => {
  const [activeTab, setActiveTab] = useState(TabType.FAN_CLUB)

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab)
  }, [])

  return (
    <Flex column w='100%'>
      <MobileFanClubTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      {activeTab === TabType.FAN_CLUB ? (
        <FanClubTabContent mint={mint} />
      ) : (
        <CoinTabContent mint={mint} />
      )}
    </Flex>
  )
}
