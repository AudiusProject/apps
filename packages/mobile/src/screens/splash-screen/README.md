# Splash Screen

This directory contains the SplashScreen component that manages the native boot splash.

## Regenerating Splash Screen Assets

The splash screen assets are generated using `react-native-bootsplash`. Source SVG files are located in `src/assets/images/`.

### Light Mode

Generate light mode assets from `bootsplash_logo.svg`:

```bash
npx react-native-bootsplash generate \
  --background="#f7f7f8" \
  --logo-width=112 \
  --assets-output=src/assets/images \
  src/assets/images/bootsplash_logo.svg
```

### Dark Mode

Generate dark mode assets from `bootsplash_logo_dark.svg`:

```bash
npx react-native-bootsplash generate \
  --background="#353A51" \
  --logo-width=112 \
  --assets-output=src/assets/images/dark \
  src/assets/images/bootsplash_logo_dark.svg
```

After generating dark mode assets, you need to manually update the iOS asset catalogs to include dark appearance variants:

1. Copy dark logo PNGs to `ios/AudiusReactNative/Images.xcassets/BootSplashLogo-*.imageset/`
2. Update the `Contents.json` files in the color and image asset folders to include dark appearance entries

See the existing asset catalog files for the correct format.

