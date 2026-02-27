/**
 * Default [Neue] theme - modern design system (light variant)
 * From Figma Default [Neue].tokens.json
 */
const defaultLightPrimitives = {
  static: {
    primary: '#7F6AD6',
    secondary: '#A74CFF',
    white: '#FFFFFF',
    staticWhite: '#F6F8FC',
    black: '#0F0F0F'
  },
  primary: {
    p100: '#E9E3FF',
    p200: '#CFC3FF',
    p300: '#7F6AD6',
    p400: '#5B44B8',
    p500: '#3B2A86',
    default: '#7F6AD6',
    primary: '#7F6AD6'
  },
  secondary: {
    s100: '#F0E0FF',
    s200: '#DDBBFF',
    s300: '#A74CFF',
    s400: '#7D2FDB',
    s500: '#4F159E',
    default: '#A74CFF',
    secondary: '#A74CFF'
  },
  neutral: {
    n25: '#F7F7F8',
    n50: '#F0F1F3',
    n100: '#E6E8EC',
    n150: '#D8DBE2',
    n200: '#C7CCD6',
    n300: '#B2B8C5',
    n400: '#9AA1B0',
    n500: '#7F8798',
    n600: '#636C7E',
    n700: '#4A5263',
    n800: '#343B49',
    n900: '#232834',
    n950: '#141821',
    default: '#343B49',
    neutral: '#343B49'
  },
  special: {
    background: '#F6F5F7',
    blue: '#7F6AD6',
    darkRed: '#C44357',
    glassOverlay: '#00000014',
    gradientStop1: '#7F6AD6',
    gradientStop2: '#5B44B8',
    gradient: 'linear-gradient(315deg, #7F6AD6 0%, #5B44B8 100%)',
    coinGradient:
      'linear-gradient(85deg, #7F6AD6 -4.82%, #A74CFF 49.8%, #7F6AD6 104.43%)',
    coinGradientColor1: '#7F6AD6',
    coinGradientColor2: '#A74CFF',
    coinGradientColor3: '#7F6AD6',
    green: '#0F9E48',
    lightGreen: '#A74CFF',
    orange: '#FF9400',
    red: '#F94D62',
    trendingBlue: '#2A85E8',
    white: '#FFFFFF',
    default: '#7F6AD6',
    special: '#7F6AD6'
  }
}

/**
 * Dark [Neue] theme - modern design system (dark variant)
 * From Figma Dark [Neue].tokens.json
 */
const defaultDarkPrimitives = {
  static: {
    primary: '#917FD8',
    secondary: '#C67CFF',
    white: '#0F0F0F',
    staticWhite: '#F6F8FC',
    black: '#FFFFFF'
  },
  primary: {
    p100: '#261F40',
    p200: '#443873',
    p300: '#806AD8',
    p400: '#9E8EE8',
    p500: '#D8CFFF',
    default: '#806AD8',
    primary: '#806AD8'
  },
  secondary: {
    s100: '#9A66CA',
    s200: '#B071E4',
    s300: '#C67CFF',
    s400: '#CF90FF',
    s500: '#D7A3FF',
    default: '#C67CFF',
    secondary: '#C67CFF'
  },
  neutral: {
    n25: '#0F0F0F',
    n50: '#141414',
    n100: '#1F1F1F',
    n150: '#292929',
    n200: '#333333',
    n300: '#474747',
    n400: '#636363',
    n500: '#6B6B6B',
    n600: '#757575',
    n700: '#858585',
    n800: '#949494',
    n900: '#A3A3A3',
    n950: '#B2B2B2',
    default: '#949494',
    neutral: '#949494'
  },
  special: {
    background: '#000000',
    blue: '#806AD8',
    darkRed: '#C44357',
    glassOverlay: '#0F0F0F99',
    gradientStop1: '#806AD8',
    gradientStop2: '#9E8EE8',
    gradient: 'linear-gradient(315deg, #806AD8 0%, #9E8EE8 100%)',
    coinGradient:
      'linear-gradient(85deg, #806AD8 -4.82%, #C67CFF 49.8%, #806AD8 104.43%)',
    coinGradientColor1: '#806AD8',
    coinGradientColor2: '#C67CFF',
    coinGradientColor3: '#806AD8',
    green: '#84DF64',
    lightGreen: '#C67CFF',
    orange: '#EFB360',
    red: '#F94D62',
    trendingBlue: '#2A85E8',
    white: '#0F0F0F',
    default: '#806AD8',
    special: '#806AD8'
  }
}

/** Classic theme light variant (legacy day) */
const classicLightPrimitives = {
  static: {
    primary: '#CC0FE0FF',
    secondary: '#7E1BCCFF',
    white: '#FFFFFFFF',
    staticWhite: '#FFFFFFFF',
    black: '#000000'
  },
  primary: {
    p100: '#D63FE6FF',
    p200: '#D127E3FF',
    p300: '#CC0FE0FF',
    p400: '#B80ECAFF',
    p500: '#A30CB3FF',
    default: '#CC0FE0FF',
    primary: '#CC0FE0FF'
  },
  secondary: {
    s100: '#9849D6FF',
    s200: '#8B32D1FF',
    s300: '#7E1BCCFF',
    s400: '#7118B8FF',
    s500: '#6516A3FF',
    default: '#7E1BCCFF',
    secondary: '#7E1BCCFF'
  },
  neutral: {
    n25: '#FAFAFAFF',
    n50: '#F7F7F8FF',
    n100: '#EFEFF1FF',
    n150: '#E7E7EAFF',
    n200: '#D6D5DBFF',
    n300: '#C3C1CBFF',
    n400: '#A2A0AFFF',
    n500: '#938FA3FF',
    n600: '#817D95FF',
    n700: '#736E88FF',
    n800: '#6C6780FF',
    n900: '#615D73FF',
    n950: '#524F62FF',
    default: '#6C6780FF',
    neutral: '#6C6780FF'
  },
  special: {
    background: '#F6F5F7FF',
    blue: '#1BA1F1FF',
    darkRed: '#BB0218FF',
    glassOverlay: '#FFFFFFD9',
    gradientStop1: '#5B23E1FF',
    gradientStop2: '#A22FEBFF',
    gradient: 'linear-gradient(315deg, #5B23E1FF 0%, #A22FEBFF 100%)',
    coinGradient:
      'linear-gradient(85deg, #CC0FE0FF -4.82%, #7E1BCCFF 49.8%, #1BA1F1FF 104.43%)',
    coinGradientColor1: '#CC0FE0FF',
    coinGradientColor2: '#7E1BCCFF',
    coinGradientColor3: '#1BA1F1FF',
    green: '#0F9E48FF',
    lightGreen: '#13C65AFF',
    orange: '#FF9400FF',
    red: '#D0021BFF',
    trendingBlue: '#216FDCFF',
    white: '#FFFFFFFF',
    default: '#1BA1F1FF',
    special: '#1BA1F1FF'
  }
}

/** Classic theme dark variant (legacy dark) */
const classicDarkPrimitives = {
  static: {
    primary: '#B94CC2FF',
    secondary: '#7E1BCCFF',
    white: '#2F3348FF',
    staticWhite: '#F6F8FCFF',
    black: '#000000'
  },
  primary: {
    p100: '#924699FF',
    p200: '#B356BBFF',
    p300: '#D767E1FF',
    p400: '#F479FFFF',
    p500: '#F7A4FFFF',
    default: '#D767E1FF',
    primary: '#D767E1FF'
  },
  secondary: {
    s100: '#9A66CAFF',
    s200: '#B071E4FF',
    s300: '#C67CFFFF',
    s400: '#CF90FFFF',
    s500: '#D7A3FFFF',
    default: '#C67CFFFF',
    secondary: '#C67CFFFF'
  },
  neutral: {
    n25: '#30354AFF',
    n50: '#353A51FF',
    n100: '#3C425DFF',
    n150: '#444B69FF',
    n200: '#4F577AFF',
    n300: '#656F9BFF',
    n400: '#7B83A7FF',
    n500: '#969BB6FF',
    n600: '#A6AAC0FF',
    n700: '#B6B9CBFF',
    n800: '#C6C8D6FF',
    n900: '#D6D7E1FF',
    n950: '#E6E7EDFF',
    default: '#C6C8D6FF',
    neutral: '#C6C8D6FF'
  },
  special: {
    background: '#202131FF',
    blue: '#58B9F4FF',
    darkRed: '#C43047FF',
    glassOverlay: '#2F334899',
    gradientStop1: '#9469EEFF',
    gradientStop2: '#C781FCFF',
    gradient: 'linear-gradient(315deg, #9469EEFF 0%, #C781FCFF 100%)',
    coinGradient:
      'linear-gradient(85deg, #D767E1FF -4.82%, #C67CFFFF 49.8%, #58B9F4FF 104.43%)',
    coinGradientColor1: '#D767E1FF',
    coinGradientColor2: '#C67CFFFF',
    coinGradientColor3: '#58B9F4FF',
    green: '#6CDF44FF',
    lightGreen: '#15D864FF',
    orange: '#EFA947FF',
    red: '#F9344CFF',
    trendingBlue: '#2A85E8FF',
    white: '#2F3348FF',
    default: '#58B9F4FF',
    special: '#58B9F4FF'
  }
}

/** Matrix theme (single mode, no light/dark variant) */
const matrixPrimitives = {
  static: {
    primary: '#B94CC2FF',
    secondary: '#7E1BCCFF',
    white: '#020804FF',
    staticWhite: '#F6F8FCFF',
    black: '#000000'
  },
  primary: {
    p100: '#08A008FF',
    p200: '#09B509FF',
    p300: '#0BD90BFF',
    p400: '#0BE40BFF',
    p500: '#3DF23DFF',
    default: '#0BD90BFF',
    primary: '#0BD90BFF'
  },
  secondary: {
    s100: '#00A73CFF',
    s200: '#00BD44FF',
    s300: '#00E252FF',
    s400: '#00ED56FF',
    s500: '#3CFB6BFF',
    default: '#00E252FF',
    secondary: '#00E252FF'
  },
  neutral: {
    n25: '#010B06FF',
    n50: '#041308FF',
    n100: '#0A1F0DFF',
    n150: '#0F2F15FF',
    n200: '#123F1BFF',
    n300: '#166527FF',
    n400: '#1C8736FF',
    n500: '#1F9E3FFF',
    n600: '#2EB954FF',
    n700: '#34D561FF',
    n800: '#3EF56BFF',
    n900: '#54FF80FF',
    n950: '#9BFFA7FF',
    default: '#3EF56BFF',
    neutral: '#3EF56BFF'
  },
  special: {
    background: '#000000FF',
    blue: '#20E290FF',
    darkRed: '#D63C5AFF',
    glassOverlay: '#01010199',
    gradientStop1: '#6CDF44FF',
    gradientStop2: '#13C65AFF',
    gradient: 'linear-gradient(315deg, #6CDF44FF 0%, #13C65AFF 100%)',
    coinGradient:
      'linear-gradient(85deg, #0BD90BFF -4.82%, #00E252FF 49.8%, #20E290FF 104.43%)',
    coinGradientColor1: '#0BD90BFF',
    coinGradientColor2: '#00E252FF',
    coinGradientColor3: '#20E290FF',
    green: '#2EB954FF',
    lightGreen: '#0BF90BFF',
    orange: '#FFA524FF',
    red: '#F9344CFF',
    trendingBlue: '#1EEB6FFF',
    white: '#020804FF',
    default: '#20E290FF',
    special: '#20E290FF'
  }
}

export const primitiveTheme = {
  /** Default theme light variant (Neue design system) */
  defaultLight: defaultLightPrimitives,
  /** Default theme dark variant (Neue design system) */
  defaultDark: defaultDarkPrimitives,
  /** Classic theme light variant (legacy day) */
  classicLight: classicLightPrimitives,
  /** Classic theme dark variant (legacy dark) */
  classicDark: classicDarkPrimitives,
  /** Matrix theme (single mode, no light/dark) */
  matrix: matrixPrimitives,
  /** @deprecated Use classicLight. Backward compatibility. */
  day: classicLightPrimitives,
  /** @deprecated Use classicDark. Backward compatibility. */
  dark: classicDarkPrimitives
}

export type PrimitiveColors = typeof primitiveTheme.defaultLight
export type PrimaryColors = keyof PrimitiveColors['primary']
export type SecondaryColors = keyof PrimitiveColors['secondary']
export type NeutralColors = keyof PrimitiveColors['neutral']
export type SpecialColors = keyof PrimitiveColors['special']
export type StaticColors = keyof PrimitiveColors['static']
