/**
 * Example usage of UserBalanceHistoryGraph component
 *
 * This file demonstrates how to integrate the balance history graph
 * into your page or component. You can copy the relevant parts into
 * your actual implementation.
 */

import { UserBalanceHistoryGraph } from './UserBalanceHistoryGraph'

// Example 1: Show graph for current user
export const CurrentUserBalanceExample = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <UserBalanceHistoryGraph />
    </div>
  )
}

// Example 2: Show graph for specific user
export const SpecificUserBalanceExample = () => {
  const userId = 123 // Replace with actual user ID

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <UserBalanceHistoryGraph userId={userId} />
    </div>
  )
}

// Example 3: In a profile page
export const ProfilePageExample = ({ userId }: { userId: number }) => {
  return (
    <div>
      <h1>User Profile</h1>

      {/* Other profile content */}

      <section>
        <UserBalanceHistoryGraph userId={userId} />
      </section>

      {/* More content */}
    </div>
  )
}

// Example 4: In a wallet/balance page with multiple sections
export const WalletPageExample = () => {
  return (
    <div style={{ padding: '24px' }}>
      <h1>My Wallet</h1>

      {/* Current balance summary */}
      <section>{/* Balance cards, etc. */}</section>

      {/* Balance history graph */}
      <section style={{ marginTop: '32px' }}>
        <UserBalanceHistoryGraph />
      </section>

      {/* Transaction history */}
      <section style={{ marginTop: '32px' }}>
        {/* Transaction list, etc. */}
      </section>
    </div>
  )
}
