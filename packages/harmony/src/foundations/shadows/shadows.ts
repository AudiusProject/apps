import type { ViewStyle } from 'react-native'

export type ShadowOptions =
  | 'near'
  | 'mid'
  | 'midInverted'
  | 'far'
  | 'emphasis'
  | 'special'
  | 'drop'

export const nativeShadows: Record<
  Exclude<ShadowOptions, 'drop'>,
  ViewStyle
> = {
  near: {
    // IOS
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowColor: '#000',
    // Android
    elevation: 1
  },
  mid: {
    // IOS
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowColor: '#000',
    // Android
    elevation: 2
  },
  midInverted: {
    // IOS
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
    shadowColor: '#000',
    // Android
    elevation: 2
  },
  far: {
    // IOS
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.08,
    shadowColor: '#000',
    // Android
    elevation: 3
  },
  emphasis: {
    // IOS
    shadowOffset: { width: 0, height: 1.34018 },
    shadowRadius: 8,
    shadowOpacity: 0.2,
    shadowColor: '#000',
    // Android
    elevation: 6
  },
  special: {
    // IOS
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 17,
    shadowOpacity: 0.2,
    shadowColor: '#565776',
    // Android
    elevation: 6
  }
}

export const shadows: Record<ShadowOptions, string> & {
  native: typeof nativeShadows
} = {
  near: '0px 2px 4px 0px rgba(0, 0, 0, 0.08), 0px 0px 6px 0px rgba(0, 0, 0, 0.02)',
  mid: '0px 4px 8px 0px rgba(0, 0, 0, 0.06), 0px 0px 4px 0px rgba(0, 0, 0, 0.04)',
  midInverted:
    '0px -4px 8px 0px rgba(0, 0, 0, 0.06), 0px 0px 4px 0px rgba(0, 0, 0, 0.04)',
  far: '0px 8px 16px 0px rgba(0, 0, 0, 0.08), 0px 0px 4px 0px rgba(0, 0, 0, 0.04)',
  emphasis:
    '0px 1.34018px 8px 0px rgba(0, 0, 0, 0.2), 0px 6px 15px 0px rgba(0, 0, 0, 0.1)',
  special: '0px 1px 20px -3px #565776',
  drop: 'drop-shadow(0px 1.34018px 8px rgba(0, 0, 0, 0.2)) drop-shadow(0px 6px 15px rgba(0, 0, 0, 0.1))',
  native: nativeShadows
}

export type Shadows = typeof shadows
