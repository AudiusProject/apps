import React, { Suspense } from 'react'
import { ActivityIndicator, View } from 'react-native'

/**
 * Creates a lazy-loaded screen component for React Navigation.
 * This wrapper handles Suspense boundaries and provides a loading fallback.
 *
 * @param importFn - Function that returns a dynamic import promise
 * @param fallback - Optional custom fallback component (defaults to ActivityIndicator)
 * @returns A component that can be used with React Navigation's Stack.Screen
 *
 * @example
 * const LazyProfileScreen = lazyScreen(() => import('app/screens/profile-screen'))
 * // Then use: <Stack.Screen name="Profile" component={LazyProfileScreen} />
 */
export const lazyScreen = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T } | { [key: string]: T }>,
  fallback?: React.ComponentType
): React.ComponentType<any> => {
  const LazyComponent = React.lazy(async () => {
    const module = await importFn()
    // Handle both default exports and named exports
    if ('default' in module) {
      return module
    }
    // If no default, try to find the first exported component
    const firstExport = Object.values(module)[0]
    return { default: firstExport as T }
  })

  const FallbackComponent = fallback ?? (() => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  ))

  return (props: any) => (
    <Suspense fallback={<FallbackComponent />}>
      <LazyComponent {...props} />
    </Suspense>
  )
}

/**
 * Helper to create lazy screens with named exports.
 * Use this when the screen is exported as a named export rather than default.
 *
 * @param importFn - Function that returns a dynamic import promise
 * @param exportName - Name of the exported component
 * @param fallback - Optional custom fallback component
 * @returns A component that can be used with React Navigation's Stack.Screen
 *
 * @example
 * const LazyProfileScreen = lazyScreenNamed(
 *   () => import('app/screens/profile-screen'),
 *   'ProfileScreen'
 * )
 */
export const lazyScreenNamed = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ [key: string]: T }>,
  exportName: string,
  fallback?: React.ComponentType
): React.ComponentType<any> => {
  const LazyComponent = React.lazy(async () => {
    const module = await importFn()
    const component = module[exportName]
    if (!component) {
      throw new Error(
        `Export "${exportName}" not found in module. Available exports: ${Object.keys(module).join(', ')}`
      )
    }
    return { default: component }
  })

  const FallbackComponent = fallback ?? (() => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  ))

  return (props: any) => (
    <Suspense fallback={<FallbackComponent />}>
      <LazyComponent {...props} />
    </Suspense>
  )
}

