# Reactotron Setup for Audius Mobile

Reactotron has been added to the Audius mobile app for enhanced debugging capabilities.

## Installation

Reactotron is already configured in the project. You just need to install the desktop app.

### Download Reactotron Desktop App

Download the desktop app from: https://github.com/infinitered/reactotron/releases

Choose the appropriate version for your operating system (Windows, Mac, or Linux).

## Configuration

The configuration is already set up in `ReactotronConfig.js` with the following features:

- React Native plugins enabled
- AsyncStorage integration
- Network request monitoring (ignores symbolicate requests)
- Error tracking
- Custom app name: "Audius Mobile"

## Usage

### For iOS Simulator

1. Start the Reactotron desktop app
2. Run the mobile app with `npm run ios` (or `npm run ios:local` if running against a local protocol stack)
3. Reactotron should automatically connect

### For Android Emulator/Device

1. Set up port forwarding (required for Android):
   ```bash
   adb reverse tcp:9090 tcp:9090
   ```
2. Start the Reactotron desktop app
3. Run the mobile app with `npm run android` (or `npm run android:local` if running against a local protocol stack)
4. Reactotron should connect

### For Physical iOS Device

1. Find your computer's IP address
2. Update `ReactotronConfig.js` and change `host: 'localhost'` to your IP address
3. Make sure your device and computer are on the same network
4. Start Reactotron and run the app

## Features Available

- **Timeline**: See all actions, API calls, and logs in real-time
- **State**: Inspect Redux state and dispatched actions
- **API**: Monitor network requests and responses
- **AsyncStorage**: View and edit AsyncStorage contents
- **Custom Commands**: Send custom commands to your app
- **Performance**: Track render times and performance metrics

## Development Only

Reactotron is automatically disabled in production builds and only runs when `__DEV__` is true.

## Troubleshooting

- **Connection Issues**: Make sure the port 9090 is not blocked by firewall
- **Android Not Connecting**: Ensure `adb reverse tcp:9090 tcp:9090` is run
- **Physical Device**: Use your computer's IP address instead of localhost
- **Multiple Apps**: Each app instance shows as a separate connection in Reactotron
