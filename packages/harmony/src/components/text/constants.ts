export const variantTagMap = {
  display: {
    xl: 'h1',
    l: 'h1',
    m: 'h1',
    s: 'h1'
  },
  heading: {
    xl: 'h1',
    l: 'h2',
    m: 'h3',
    s: 'h4'
  },
  title: {
    xl: 'h5',
    l: 'h5',
    m: 'h5',
    s: 'h5'
  },
  label: {
    xl: 'p',
    l: 'p',
    m: 'p',
    s: 'p',
    xs: 'p'
  }
}

export const variantStylesMap = {
  display: {
    fontSize: { s: '6xl', m: '7xl', l: '8xl', xl: '9xl' },
    lineHeight: { s: '3xl', m: '4xl', l: '5xl', xl: '6xl' },
    fontWeight: { default: 'bold', strong: 'heavy' }
  },
  heading: {
    fontSize: { s: 'xl', m: '2xl', l: '3xl', xl: '5xl' },
    lineHeight: { s: 'l', m: 'xl', l: 'hl', xl: '2xl' },
    fontWeight: { default: 'bold', strong: 'heavy' }
  },
  title: {
    fontSize: { xs: 'xs', s: 's', m: 'm', l: 'l' },
    lineHeight: { xs: 's', s: 'm', m: 'l', l: 'l' },
    fontWeight: { weak: 'demiBold', default: 'bold', strong: 'heavy' }
  },
  label: {
    fontSize: { xs: '2xs', s: 'xs', m: 's', l: 'm', xl: 'xl' },
    lineHeight: { xs: 'xs', s: 'xs', m: 's', l: 's', xl: 'l' },
    fontWeight: { default: 'bold', strong: 'heavy' },
    css: { textTransform: 'uppercase' as const, letterSpacing: 0.5 }
  },
  body: {
    fontSize: { xs: 'xs', s: 's', m: 'm', l: 'l' },
    lineHeight: { xs: 's', s: 'm', m: 'l', l: 'l' },
    fontWeight: { default: 'medium', strong: 'demiBold' }
  }
}

export const bodyLineHeightMap = {
  xs: { single: 'xs', multi: 's' },
  s: { single: 's', multi: 'l' },
  m: { single: 's', multi: 'l' },
  l: { single: 'm', multi: 'bl' }
}
