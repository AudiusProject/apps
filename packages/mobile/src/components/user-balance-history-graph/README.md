# UserBalanceHistoryGraph (React Native)

A React Native graph component that displays a user's balance history over the past week, showing hourly data points for their total balance (coins + USDC + AUDIO) in USD.

## Features

- **Weekly History**: Displays balance data for the past 7 days with hourly granularity (168 data points)
- **Interactive Tooltip**: Tap and hold on the graph to see exact balance and timestamp
- **Smooth Animations**: 800ms animation on mount using react-native-reanimated
- **Gradient Fill**: Beautiful gradient under the line matching Audius brand colors
- **Responsive Design**: Adapts to different screen sizes
- **Loading State**: Shows spinner and message while data is fetching
- **Error Handling**: Displays friendly error message if data fails to load
- **Theme-Aware**: Uses Harmony theme colors that adapt to light/dark mode

## Installation

First, install the required peer dependency:

```bash
cd packages/mobile
npm install react-native-gifted-charts react-native-svg
```

For iOS, install pods:
```bash
cd ios && pod install && cd ..
```

Rebuild the app:
```bash
npm run ios:dev  # or npm run android:dev
```

## Usage

### Basic Usage (Current User)

```tsx
import { UserBalanceHistoryGraph } from 'app/components/user-balance-history-graph'

export const WalletScreen = () => {
  return (
    <ScrollView>
      <UserBalanceHistoryGraph />
    </ScrollView>
  )
}
```

### With Specific User ID

```tsx
import { UserBalanceHistoryGraph } from 'app/components/user-balance-history-graph'

export const UserProfileScreen = ({ route }) => {
  const { userId } = route.params
  
  return (
    <ScrollView>
      <UserBalanceHistoryGraph userId={userId} />
    </ScrollView>
  )
}
```

### Custom Width/Height

```tsx
import { UserBalanceHistoryGraph } from 'app/components/user-balance-history-graph'
import { useWindowDimensions } from 'react-native'

export const BalanceScreen = () => {
  const { width } = useWindowDimensions()
  
  return (
    <UserBalanceHistoryGraph 
      width={width - 32} 
      height={250}
    />
  )
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `userId` | `number` | No | Current user | The ID of the user whose balance history to display |
| `width` | `number` | No | 350 | Width of the chart in pixels |
| `height` | `number` | No | 200 | Height of the chart in pixels |

## Data Hook

The component uses the same hook as the web version: `useUserBalanceHistory` from `@audius/common/api`.

```tsx
import { useUserBalanceHistory } from '@audius/common/api'

const { data, isLoading, isError } = useUserBalanceHistory({ userId })
```

### Mock Data

Currently returns **mock data** to facilitate frontend development. See the web package README for details on the mock data generation.

## Styling

The component uses:
- **Theme Colors**: Automatically adapts to light/dark mode using `useThemeColors()`
- **Harmony Components**: Uses Flex and Text from `@audius/harmony`
- **StyleSheet**: React Native StyleSheet for performance

### Colors

- **Primary Line**: `accentPurple` from theme (`#7E1BCC`)
- **Gradient Start**: 15% opacity purple
- **Gradient End**: 5% opacity purple
- **Grid Lines**: `neutralLight4` from theme
- **Text**: `neutral` from theme

## Interaction

### Tooltip Behavior

- **Trigger**: Tap and hold on any point on the graph
- **Display**: Shows date/time and exact dollar amount
- **Auto-dismiss**: Disappears after 4 seconds or when you lift your finger
- **Position**: Automatically adjusts to stay on screen

### Animation

- **On Mount**: 800ms smooth animation of the line drawing
- **On Update**: Smooth transitions when data changes
- **Curve Smoothing**: Uses bezier curves for a polished look

## Performance

- **Optimized Rendering**: Uses `useMemo` for expensive calculations
- **Efficient Updates**: Only re-renders when data changes
- **Smooth Scrolling**: Works well inside ScrollView or FlatList
- **Memory Efficient**: Cleans up properly on unmount

## Accessibility

The component is built with accessibility in mind:
- Semantic text components from Harmony
- Clear loading and error states
- Readable font sizes and colors
- Sufficient touch target sizes

## Technical Details

### Dependencies

- `react-native-gifted-charts` - Charting library
- `react-native-svg` - SVG rendering (peer dependency of gifted-charts)
- `@audius/common/api` - Data hook
- `@audius/harmony` - UI components
- `react-native-reanimated` - Animations (already in package.json)
- `react-native-linear-gradient` - Gradient fills (already in package.json)

### Chart Configuration

- **Curve Tension**: 0.4 (smooth bezier curves)
- **Data Sampling**: Shows 7 day labels for weekly data
- **Y-Axis**: 4 horizontal grid lines
- **X-Axis**: ~7 labeled points (Mon, Tue, etc.)
- **Data Points**: Small circles (4px diameter)
- **Pointer Strip**: Dashed line with 4px dash pattern

## Troubleshooting

### Chart not appearing?

Make sure you've installed the peer dependencies:
```bash
npm install react-native-svg
cd ios && pod install  # iOS only
```

### TypeScript errors?

The `lineDataItem` type is imported from `react-native-gifted-charts`. Make sure the package is installed and types are recognized.

### Animation not working?

Ensure `react-native-reanimated` is properly set up. Check your `babel.config.js` includes the reanimated plugin:

```js
plugins: ['react-native-reanimated/plugin']
```

### Colors not showing correctly?

The component uses theme colors from Harmony. Make sure your component is wrapped in the ThemeProvider.

## Future Enhancements

When the backend is implemented, consider adding:
- Pull-to-refresh to fetch latest data
- Time range selector (1D, 1W, 1M, 3M, 1Y)
- Pinch to zoom
- Share graph as image
- Compare with previous period
- Multiple currencies support

## Comparison with Web Version

Both implementations share:
- ✅ Same data hook (`useUserBalanceHistory`)
- ✅ Same color scheme (Audius purple)
- ✅ Same data format (168 hourly points)
- ✅ Interactive tooltips
- ✅ Loading and error states
- ✅ Currency formatting

Differences:
- 📱 Mobile uses tap-and-hold vs. hover for tooltips
- 📱 Mobile uses native animations (reanimated) vs. canvas
- 📱 Mobile adapts to touch interactions
- 📱 Mobile uses theme-aware colors automatically

