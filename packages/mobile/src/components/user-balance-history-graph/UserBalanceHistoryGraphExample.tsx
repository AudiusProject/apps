/**
 * Example usage of UserBalanceHistoryGraph component for React Native
 *
 * This file demonstrates various ways to integrate the balance history graph
 * into your screens. Copy the relevant parts into your actual implementation.
 */

import { ScrollView, View, useWindowDimensions } from 'react-native'

import { useUserBalanceHistory } from '@audius/common/api'
import { Flex, Text } from '@audius/harmony'

import { UserBalanceHistoryGraph } from './UserBalanceHistoryGraph'

// Example 1: Simple usage in a wallet screen
export const WalletScreenExample = () => {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFF' }}>
      <View style={{ padding: 16 }}>
        {/* Other wallet content */}
        <Text variant='title' size='l'>
          My Wallet
        </Text>

        {/* Balance cards, etc. */}

        {/* Balance history graph */}
        <View style={{ marginTop: 24 }}>
          <UserBalanceHistoryGraph />
        </View>

        {/* Transaction list, etc. */}
      </View>
    </ScrollView>
  )
}

// Example 2: Full-width responsive graph
export const ResponsiveGraphExample = () => {
  const { width } = useWindowDimensions()

  return (
    <ScrollView>
      <View style={{ padding: 16 }}>
        <UserBalanceHistoryGraph
          width={width - 32} // Account for padding
          height={250}
        />
      </View>
    </ScrollView>
  )
}

// Example 3: User profile with balance history
export const UserProfileScreenExample = ({ route }: any) => {
  const { userId } = route.params

  return (
    <ScrollView>
      <View style={{ padding: 16 }}>
        {/* Profile header */}
        <View style={{ marginBottom: 24 }}>
          {/* Avatar, name, bio, etc. */}
        </View>

        {/* Balance section */}
        <Flex column gap='l'>
          <Text variant='heading' size='l'>
            Balance Overview
          </Text>
          <UserBalanceHistoryGraph userId={userId} />
        </Flex>

        {/* Other profile sections */}
      </View>
    </ScrollView>
  )
}

// Example 4: In a tab view
export const BalanceTabExample = () => {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Summary card */}
      <View style={{ marginBottom: 16 }}>
        <Text variant='heading' size='m'>
          Total Balance
        </Text>
        {/* Current balance display */}
      </View>

      {/* Graph */}
      <UserBalanceHistoryGraph height={180} />

      {/* Additional info */}
      <View style={{ marginTop: 16 }}>
        <Text variant='body' size='s' strength='weak'>
          Last updated: Just now
        </Text>
      </View>
    </View>
  )
}

// Example 5: With custom container styling
export const StyledGraphExample = () => {
  return (
    <View style={{ padding: 16 }}>
      <View
        style={{
          backgroundColor: '#F7F7F9',
          borderRadius: 16,
          padding: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}
      >
        <UserBalanceHistoryGraph />
      </View>
    </View>
  )
}

// Example 6: In a modal/bottom sheet
export const BalanceHistoryModalExample = ({ isVisible, onClose }: any) => {
  return (
    <View style={{ flex: 1, padding: 24 }}>
      {/* Modal header */}
      <Flex row justifyContent='space-between' alignItems='center'>
        <Text variant='heading' size='l'>
          Balance History
        </Text>
        {/* Close button */}
      </Flex>

      {/* Graph */}
      <View style={{ marginTop: 24, marginBottom: 16 }}>
        <UserBalanceHistoryGraph height={220} />
      </View>

      {/* Additional controls or info */}
      <View>
        <Text variant='body' size='s' strength='weak'>
          Showing the last 7 days of balance history
        </Text>
      </View>
    </View>
  )
}

// Example 7: With loading state handling
export const GraphWithCustomLoadingExample = () => {
  const { data: historyData, isLoading } = useUserBalanceHistory()

  if (isLoading) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Text>Loading your balance history...</Text>
      </View>
    )
  }

  return <UserBalanceHistoryGraph />
}
