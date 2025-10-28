# Installing the Chart Library for UserBalanceHistoryGraph

The `UserBalanceHistoryGraph` component requires `react-native-gifted-charts` to render charts.

## Installation Steps

### 1. Install Dependencies

The required dependencies have been added to `package.json`. Install them:

```bash
cd packages/mobile
npm install
```

**Note**: `react-native-svg` is already installed, so you don't need to install it separately.

### 2. Install iOS Pods (iOS only)

```bash
cd ios
pod install
cd ..
```

### 3. Rebuild the App

For iOS:
```bash
npm run ios:dev
# or
npm run ios:prod
```

For Android:
```bash
npm run android:dev
# or
npm run android:prod
```

## Dependencies Added

- **react-native-gifted-charts** (v1.4.46): Modern, performant charting library
  - Zero dependencies except react-native-svg
  - Built-in animations using react-native-reanimated
  - TypeScript support
  - Active maintenance

## Peer Dependencies (Already Installed)

These are already in your package.json:
- ✅ `react-native-svg` (v15.10.1)
- ✅ `react-native-reanimated` (v3.16.1)
- ✅ `react-native-linear-gradient` (v2.8.3)

## Troubleshooting

### iOS Build Issues

If you encounter build issues on iOS:

1. Clean the build folder:
```bash
cd ios
rm -rf build
rm -rf Pods
pod install
cd ..
```

2. Clean the Metro bundler cache:
```bash
npm start -- --reset-cache
```

### Android Build Issues

If you encounter build issues on Android:

1. Clean the build:
```bash
cd android
./gradlew clean
cd ..
```

2. Clear Metro cache:
```bash
npm start -- --reset-cache
```

### TypeScript Errors

If you see TypeScript errors related to `react-native-gifted-charts`:

1. Make sure your node_modules are up to date:
```bash
rm -rf node_modules
npm install
```

2. Restart your TypeScript server in your IDE

### Chart Not Rendering

If the chart doesn't appear:

1. Make sure `react-native-svg` is properly installed:
```bash
npm list react-native-svg
```

2. Verify react-native-reanimated is configured in `babel.config.js`:
```js
module.exports = {
  plugins: [
    // ... other plugins
    'react-native-reanimated/plugin', // Must be last
  ],
}
```

3. For iOS, ensure pods are installed:
```bash
cd ios && pod install && cd ..
```

## Version Compatibility

The installed versions are compatible with:
- React Native 0.76.9
- React 18.3.1
- TypeScript 5.x

## Alternative Libraries (Not Recommended)

If you absolutely need to use a different library, alternatives include:

1. **react-native-chart-kit**: Simpler but less features
2. **victory-native**: More powerful but larger bundle size
3. **react-native-svg-charts**: Deprecated, not recommended

However, `react-native-gifted-charts` is the best choice for this use case because:
- Modern and actively maintained
- Great performance
- Beautiful animations out of the box
- Small bundle size
- Excellent TypeScript support
- Works perfectly with your existing dependencies

## Post-Installation

After installation, you can use the component:

```tsx
import { UserBalanceHistoryGraph } from 'app/components/user-balance-history-graph'

export const MyScreen = () => {
  return <UserBalanceHistoryGraph />
}
```

For more examples, see:
- `src/components/user-balance-history-graph/README.md`
- `src/components/user-balance-history-graph/UserBalanceHistoryGraphExample.tsx`

