# UserBalanceHistoryGraph Component

A graph component that displays a user's balance history over the past week, showing hourly data points for their total balance (coins + USDC + AUDIO) in USD.

## Features

- **Weekly History**: Displays balance data for the past 7 days with hourly granularity (168 data points)
- **Interactive Tooltip**: Hover over the graph to see exact balance and timestamp
- **Responsive Design**: Adapts to container width while maintaining readability
- **Loading State**: Shows spinner and message while data is fetching
- **Error Handling**: Displays friendly error message if data fails to load
- **Chart.js Integration**: Uses the existing `chart.js` and `react-chartjs-2` libraries

## Usage

### Basic Usage

```tsx
import { UserBalanceHistoryGraph } from 'components/user-balance-history-graph'

export const MyPage = () => {
  return (
    <div>
      <UserBalanceHistoryGraph />
    </div>
  )
}
```

### With Specific User ID

```tsx
import { UserBalanceHistoryGraph } from 'components/user-balance-history-graph'

export const UserProfile = ({ userId }: { userId: number }) => {
  return (
    <div>
      <UserBalanceHistoryGraph userId={userId} />
    </div>
  )
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `userId` | `number` | No | Current user | The ID of the user whose balance history to display |

## Data Hook

The component uses the `useUserBalanceHistory` hook from `@audius/common/api`:

```tsx
import { useUserBalanceHistory } from '@audius/common/api'

const { data, isLoading, isError } = useUserBalanceHistory({ userId })
```

### Mock Data

Currently, the hook returns **mock data** to facilitate frontend development. The backend implementation is being developed separately.

The mock data:
- Generates 168 hourly data points (7 days)
- Creates realistic-looking balance fluctuations with ±2% variance per hour
- Includes a subtle trend pattern using sine wave variation
- Simulates a 300ms network delay

### Backend Integration

When the backend is ready, replace the mock implementation in:
```
packages/common/src/api/tan-query/wallets/useUserBalanceHistory.ts
```

The expected API response format:
```typescript
type BalanceHistoryDataPoint = {
  timestamp: number  // Unix timestamp in milliseconds
  balanceUsd: number // Total balance in USD (coins + USDC + AUDIO)
}
```

## Styling

The component uses CSS modules for styling. The main styles are defined in:
```
UserBalanceHistoryGraph.module.css
```

### Theme Integration

The component uses Harmony design system tokens:
- `--harmony-surface-1` - Container background
- `--harmony-border-default` - Tooltip border
- `--harmony-text-default` - Primary text color
- `--harmony-text-subdued` - Secondary text color

### Chart Colors

The graph uses a purple color scheme matching the Figma design:
- Line color: `rgba(126, 27, 204, 1)` (Audius purple)
- Fill gradient: `rgba(126, 27, 204, 0.15)` (15% opacity)
- Grid lines: `rgba(243, 243, 245, 1)` (light gray)

## Technical Details

### Chart Configuration

- **Line tension**: 0.4 (smooth curve)
- **X-axis**: Time-based with day labels (e.g., "Jan 15")
- **Y-axis**: Currency formatted (e.g., "$5,000")
- **Tooltip**: Custom HTML tooltip with hover interaction
- **Responsive**: Maintains aspect ratio and adapts to container

### Performance

- Data is cached using TanStack Query with 1-minute stale time
- Chart rerenders are optimized using react-chartjs-2
- Tooltip cleanup on component unmount prevents memory leaks

## Dependencies

- `@audius/common/api` - For the `useUserBalanceHistory` hook
- `@audius/harmony` - For Flex, Text components
- `react-chartjs-2` - For the Line chart component
- `chart.js` - Charting library (v2.9.3)

## Future Enhancements

When the backend is implemented, consider adding:
- Time range selector (1 day, 1 week, 1 month, 3 months, 1 year)
- Balance breakdown tooltip (show coins, USDC, AUDIO separately)
- Export/download chart as image
- Real-time updates with polling
- Comparison with previous period

