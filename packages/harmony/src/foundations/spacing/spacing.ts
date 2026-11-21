export const spacing = {
  unit: 4,
  unitHalf: 2,
  negativeUnit: -4,

  unit1: 4,
  unit2: 8,
  unit3: 12,
  unit4: 16,
  unit5: 20,
  unit6: 24,
  unit7: 28,
  unit8: 32,
  unit9: 36,
  unit10: 40,
  unit11: 44,
  unit12: 48,
  unit13: 52,
  unit14: 56,
  unit15: 60,
  unit16: 64,
  unit17: 68,
  unit18: 72,
  unit19: 76,
  unit20: 80,
  unit21: 84,
  unit22: 88,
  unit23: 92,
  unit24: 96,

  '2xs': 2,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
  '5xl': 128
}

export const iconSizes = {
  '4xs': 8,
  '3xs': 10,
  '2xs': 12,
  xs: 14,
  s: 16,
  m: 20,
  l: 24,
  xl: 30,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48
}

export type Spacing = typeof spacing
export type SpacingOptions = keyof Spacing
export type IconSize = keyof typeof iconSizes
