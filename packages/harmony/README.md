<p align="center">

  <p align="center">
    Harmony is design system focused on collaboration, reusability, and scalability.
  </p>
  <p align="center">
    It aims to harmonize code and Figma, provide a shared language for designers and developers, and provide consistent, reusable components for use across our platforms.
  </p>
  <p align="center">
    built with ❤️ from the team <a href="https://audius.org">@Audius</a>.
  </p>
</p>

<br />
<br />

## Docs

Full documentation can be found here: [Harmony Docs](https://harmony.audius.co)

## Installation

Install `@audius/harmony`:

```bash
npm install --save @audius/harmony
```

Due to an issue with react-virtualized, if using vite you must also install a plugin to fix the build:
https://www.npmjs.com/package/esbuild-plugin-react-virtualized

```bash
npm install --save-dev esbuild-plugin-react-virtualized
```

Follow the instructions to add the plugin to your vite config:

```js
// vite.config.js
import { defineConfig } from 'vite'
import fixReactVirtualized from 'esbuild-plugin-react-virtualized'

export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      plugins: [fixReactVirtualized]
    }
  }
})
```

For more information, see:
https://github.com/bvaughn/react-virtualized/issues/1722

## Setup

Import styles exported by Harmony

```ts
import '@audius/harmony/dist/harmony.css'
```

Setup the ThemeProvider exported by Harmony

```tsx
import { ThemeProvider as HarmonyThemeProvider } from '@audius/harmony'

const App = () => {
  return <HarmonyThemeProvider theme='day'>...</HarmonyThemeProvider>
}
```

In order use emotion yourself, follow their documentation for [setting up the css-prop](https://emotion.sh/docs/css-prop)

If using typescript you will need to:

1. Add an emotion.d.ts file and include the following for access to harmony's theme type

```ts
import '@emotion/react'
import type { HarmonyTheme } from '@audius/harmony'

declare module '@emotion/react' {
  export interface Theme extends HarmonyTheme {}
}
```

2. Update your tsconfig to specify the jsxImportLocation:

```ts
{
  "compilerOptions": {
    "jsxImportSource": "@emotion/react",
    ...
  }
}
```

## Usage

```tsx
import { Button, Flex } from '@audius/harmony'

const App = () => {
  return (
    <Flex gap='m'>
      <Button variant='secondary'>Click This!</Button>
      <Button>Click That!</Button>
    </Flex>
  )
}
```

## Development

## Contribution

A Contribution Guide is [available here](https://www.notion.so/audiusproject/Submitting-for-Design-Updates-52a8bc3bb68747818a96d2721bace27f).

## Responsive Design

Harmony includes utilities to help build responsive designs consistently across the application.

### Breakpoints

The breakpoints module provides standardized screen size breakpoints and media query helpers:

```tsx
import { breakpoints } from '@audius/harmony'

// Access specific breakpoint values
const tabletWidth = breakpoints.values.md // 1024

// Use predefined media queries
const mobileQuery = breakpoints.down.sm // (max-width: 768px)
const desktopQuery = breakpoints.up.md // (min-width: 1025px)
const tabletQuery = breakpoints.between.sm_md // (min-width: 769px) and (max-width: 1024px)

// Create custom media queries
const customQuery = breakpoints.createCustomQuery(500, 800) // (min-width: 500px) and (max-width: 800px)
```

### useMedia Hook

For reactive responsive designs, use the `useMedia` hook:

```tsx
import { useMedia } from '@audius/harmony'

const MyComponent = () => {
  const {
    // Common device categories
    isMobile, // <= 768px
    isTablet, // > 768px and <= 1024px
    isDesktop, // > 1024px

    // Detailed breakpoint checks
    isExtraSmall, // <= 480px
    isSmall, // <= 768px
    isMedium, // <= 1024px

    // Check custom queries
    matchesQuery
  } = useMedia()

  return (
    <div>
      {isMobile && <MobileLayout />}
      {isTablet && <TabletLayout />}
      {isDesktop && <DesktopLayout />}

      {/* Check a custom query */}
      {matchesQuery('(orientation: portrait)') && <PortraitContent />}
    </div>
  )
}
```

### createResponsiveStyles Utility

For more maintainable responsive styling with Emotion, use the `createResponsiveStyles` utility:

```tsx
import { useMedia, createResponsiveStyles } from '@audius/harmony'

const MyComponent = () => {
  const media = useMedia()
  const { spacing } = useTheme()

  // Define styles for different breakpoints
  const styles = createResponsiveStyles(media, {
    // For a single element
    container: {
      base: {
        padding: spacing.l,
        display: 'flex'
      },
      mobile: {
        padding: spacing.m,
        flexDirection: 'column'
      },
      tablet: {
        padding: spacing.l,
        flexDirection: 'row',
        flexWrap: 'wrap'
      }
    },

    // Include multiple elements in one call
    header: {
      base: { fontSize: '24px' },
      mobile: { fontSize: '18px' }
    },

    // Use functions for complex conditional logic
    content: {
      base: { marginTop: spacing.m },
      mobile: (currentMedia) => ({
        // isExtraSmall is for phones (≤ 480px)
        ...(currentMedia.isExtraSmall && {
          marginTop: spacing.s,
          fontSize: '14px'
        })
      })
    }
  })

  return (
    <div css={styles.container}>
      <h1 css={styles.header}>Title</h1>
      <div css={styles.content}>Content</div>
    </div>
  )
}
```

The utility applies styles in this order, with later ones overriding earlier ones:

1. Base styles (always applied)
2. Mobile styles (if screen width ≤ 768px)
3. Tablet styles (if 768px < width ≤ 1024px)
4. Desktop styles (if width > 1024px)

This approach improves maintainability by:

- Grouping related styles by component part
- Keeping responsive logic out of JSX
- Making breakpoint-specific styles easy to locate and update

#### Using \*.styles.ts Files for Organization

For complex components with many responsive styles, it's beneficial to extract the styles into a separate file:

```tsx
// Button.styles.ts
import { createResponsiveStyles, useMedia } from '@audius/harmony'

type MediaContext = ReturnType<typeof useMedia>

export const getButtonStyles = (
  media: MediaContext,
  spacing: Record<string, string | number>
) => {
  return createResponsiveStyles(media, {
    container: {
      base: { display: 'flex', padding: spacing.m },
      mobile: { flexDirection: 'column' }
    }
    // More styles...
  })
}

// Button.tsx
import { getButtonStyles } from './Button.styles'

export const Button = () => {
  const media = useMedia()
  const { spacing } = useTheme()

  // Import styles from separate file
  const styles = getButtonStyles(media, spacing)

  return <div css={styles.container}>{/* Component content */}</div>
}
```

This pattern:

- Keeps component logic and style definitions separate
- Makes the component file more readable
- Promotes reusability of styles
- Makes it easier to maintain complex responsive UIs
