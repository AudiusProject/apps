# Web vs Mobile Implementation Comparison

This document compares the web (React) and mobile (React Native) implementations of the UserBalanceHistoryGraph component.

## Shared Features ✅

Both implementations share:

- **Same Data Hook**: Both use `useUserBalanceHistory` from `@audius/common/api`
- **Same Data Format**: 168 hourly data points over 7 days
- **Same Color Scheme**: Audius purple (`#7E1BCC`)
- **Same Gradient Effect**: Purple gradient fill under the line
- **Currency Formatting**: USD with proper formatting
- **Loading States**: Spinner with loading message
- **Error Handling**: Friendly error messages
- **Responsive Design**: Adapts to container size
- **Interactive Tooltips**: Show exact value and timestamp

## Technology Differences

### Web (React)
```typescript
// Chart library
import { Line } from 'react-chartjs-2'

// Styling
import styles from './UserBalanceHistoryGraph.module.css'

// Theming
CSS variables (--harmony-surface-1, etc.)
```

### Mobile (React Native)
```typescript
// Chart library
import { LineChart } from 'react-native-gifted-charts'

// Styling
import { StyleSheet } from 'react-native'

// Theming
useThemeColors() hook
```

## Implementation Comparison

| Feature | Web | Mobile |
|---------|-----|--------|
| **Chart Library** | chart.js v2.9.3 | react-native-gifted-charts v1.4.46 |
| **Wrapper** | react-chartjs-2 | Native import |
| **Styling** | CSS Modules | StyleSheet |
| **Animation** | Canvas-based | react-native-reanimated |
| **Tooltip Trigger** | Hover | Tap and hold |
| **Theme** | CSS variables | Hook-based colors |
| **Layout** | Flex (CSS) | Flex (RN) |
| **Typography** | Harmony Text | Harmony Text |

## Code Structure

### Web Component Structure
```
UserBalanceHistoryGraph.tsx
  ├── Uses chart.js Line component
  ├── CSS Module styling
  ├── Custom tooltip with DOM manipulation
  ├── Time-based X-axis (moment.js)
  └── Currency formatter (Intl.NumberFormat)
```

### Mobile Component Structure
```
UserBalanceHistoryGraph.tsx
  ├── Uses gifted-charts LineChart
  ├── StyleSheet styling
  ├── Built-in tooltip system
  ├── Timestamp-based X-axis
  └── Currency formatter (Intl.NumberFormat)
```

## Key Differences

### 1. Chart Rendering

**Web**: Uses HTML5 Canvas through chart.js
- More mature library with extensive customization
- Chart.js has been around longer
- Requires custom tooltip implementation

**Mobile**: Uses react-native-svg through gifted-charts
- Modern, React Native-first library
- Built-in touch interactions
- Native tooltip support

### 2. Interactions

**Web**: 
- Mouse hover to show tooltip
- Click and drag to pan (if enabled)
- Responsive to window resize

**Mobile**:
- Tap and hold to show tooltip
- Pinch to zoom (if enabled)
- Responsive to orientation changes

### 3. Styling Approach

**Web**:
```css
.container {
  width: 100%;
  padding: 24px;
  background: var(--harmony-surface-1);
  border-radius: 12px;
}
```

**Mobile**:
```typescript
const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 12,
    // backgroundColor applied dynamically from theme
  }
})
```

### 4. Theme Integration

**Web**: CSS custom properties
```typescript
// Uses CSS variables defined in theme
background: var(--harmony-surface-1)
color: var(--harmony-text-default)
```

**Mobile**: React context
```typescript
const { neutralLight4, accentPurple } = useThemeColors()
<View style={{ backgroundColor: neutralLight4 }} />
```

### 5. Performance Considerations

**Web**:
- Canvas rendering is efficient for many data points
- Redraw on window resize
- Tooltip cleanup on unmount

**Mobile**:
- SVG rendering with hardware acceleration
- Reanimated for smooth 60fps animations
- Automatic memory management

## Props Comparison

### Web Props
```typescript
type UserBalanceHistoryGraphProps = {
  userId?: number
}
```

### Mobile Props
```typescript
type UserBalanceHistoryGraphProps = {
  userId?: number
  width?: number    // Additional prop
  height?: number   // Additional prop
}
```

**Why the difference?**: Mobile often needs explicit dimensions due to various screen sizes and orientations.

## Animation Comparison

### Web
- Chart.js animations (tweening)
- CSS transitions for tooltip
- 300ms transitions typically

### Mobile
- react-native-reanimated animations
- Native driver for 60fps
- 800ms animation duration
- Smooth bezier curves

## Accessibility

### Web
- Keyboard navigation (tab through controls)
- Screen reader support via ARIA labels
- High contrast mode support

### Mobile
- Touch target sizes (minimum 44x44pt)
- VoiceOver/TalkBack support
- Dynamic type support

## Bundle Size Impact

### Web
- chart.js: ~60KB gzipped
- react-chartjs-2: ~5KB gzipped
- **Total: ~65KB**

### Mobile
- react-native-gifted-charts: ~45KB minified
- react-native-svg: Already in bundle
- **Total: ~45KB**

## Testing Considerations

### Web
```typescript
// Test interactions
fireEvent.mouseOver(chart)
fireEvent.mouseLeave(chart)
```

### Mobile
```typescript
// Test interactions
fireEvent.press(chart)
fireEvent.longPress(chart)
```

## When to Use Which?

### Use Web Version
- Desktop/laptop users
- Hover interactions preferred
- Complex tooltips with HTML
- Integration with existing web charts

### Use Mobile Version
- iOS/Android apps
- Touch-first interactions
- Native feel and performance
- Better for large datasets on mobile

## Future Improvements

### Both Platforms
- [ ] Time range selector (1D, 1W, 1M, etc.)
- [ ] Balance breakdown (coins, USDC, AUDIO)
- [ ] Export chart as image
- [ ] Real-time updates
- [ ] Historical comparison

### Web-Specific
- [ ] Keyboard shortcuts
- [ ] Print stylesheet
- [ ] CSV download

### Mobile-Specific
- [ ] Haptic feedback on interaction
- [ ] Share sheet integration
- [ ] Widget support (iOS 14+, Android 12+)
- [ ] Dark mode screenshot

## Maintenance

Both implementations:
- Share the same data layer (`useUserBalanceHistory`)
- Use the same Harmony design system
- Follow the same color scheme
- Have similar error handling

This makes maintenance easier as changes to data structure or business logic only need to happen once in the shared hook.

## Migration Path

If you need to switch libraries in the future:

### Web: Migrating from chart.js
Consider: Recharts, Victory, or D3.js

### Mobile: Migrating from gifted-charts
Consider: victory-native or react-native-chart-kit

The component structure is designed to make library swapping easier by keeping chart-specific code isolated.

