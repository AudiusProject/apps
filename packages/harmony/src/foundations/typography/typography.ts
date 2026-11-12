export const typography = {
  font: "'Avenir Next LT Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  weight: {
    ultraLight: 100,
    thin: 200,
    light: 300,
    regular: 400,
    medium: 500,
    demiBold: 600,
    bold: 700,
    heavy: 900
  },
  size: {
    '2xs': 10,
    xs: 12,
    s: 14,
    m: 16,
    l: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
    '6xl': 42,
    '7xl': 56,
    '8xl': 72,
    '9xl': 96
  },
  lineHeight: {
    xs: '12px',
    s: '16px',
    m: '20px',
    l: '24px',
    // body multi-line one-off
    bl: '28px',
    xl: '32px',
    // heading large one-off
    hl: '36px',
    '2xl': '48px',
    '3xl': '52px',
    '4xl': '72px',
    '5xl': '96px',
    '6xl': '120px'
  },
  shadow: {
    emphasis:
      '0px 1.34px 8px rgba(0, 0, 0, 0.20), 0px 6px 15px rgba(0, 0, 0, 0.10)'
  }
}

export type Typography = typeof typography
