import { useTheme } from '@emotion/react'

export const roundedHexClipPath = 'rounded-hex-clip-path'

export const SVGDefs = () => {
  const { color } = useTheme()
  return (
    <>
      <svg style={{ position: 'fixed', top: '-1000px' }}>
        <defs>
          <linearGradient
            x1='85.847289%'
            y1='85.847289%'
            x2='-8.9070096%'
            y2='8.9070096%'
            id='harmony-gradient'
          >
            <stop stopColor={color.special.gradientStop1} offset='0%' />
            <stop stopColor={color.special.gradientStop2} offset='100%' />
          </linearGradient>
        </defs>
        <linearGradient id='coinGradient' gradientTransform='rotate(-5)'>
          <stop stopColor={color.special.coinGradientColor1} offset='-4.82%' />
          <stop stopColor={color.special.coinGradientColor2} offset='49.8%' />
          <stop stopColor={color.special.coinGradientColor3} offset='104.43%' />
        </linearGradient>
        <linearGradient
          id='coinGradientUserSpace'
          gradientTransform='rotate(-5)'
          x1='-12.3563'
          y1='1.23603'
          x2='63.8101'
          y2='-38.1893'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor={color.special.coinGradientColor1} offset='-4.82%' />
          <stop stopColor={color.special.coinGradientColor2} offset='49.8%' />
          <stop stopColor={color.special.coinGradientColor3} offset='104.43%' />
        </linearGradient>
      </svg>
      <svg width='0' height='0' style={{ position: 'absolute' }}>
        <defs>
          <clipPath id={roundedHexClipPath} clipPathUnits='objectBoundingBox'>
            <path d='M0.966 0.378C0.93 0.301 0.887 0.228 0.839 0.158L0.824 0.136C0.805 0.108 0.779 0.085 0.75 0.068C0.721 0.051 0.688 0.041 0.655 0.039L0.627 0.036C0.543 0.03 0.457 0.03 0.373 0.036L0.346 0.039C0.312 0.041 0.279 0.051 0.25 0.068C0.221 0.085 0.196 0.108 0.177 0.136L0.161 0.158C0.113 0.228 0.07 0.302 0.034 0.378L0.022 0.403C0.008 0.433 0 0.466 0 0.5C0 0.534 0.008 0.567 0.022 0.597L0.034 0.622C0.07 0.698 0.113 0.772 0.161 0.842L0.177 0.864C0.196 0.892 0.221 0.915 0.25 0.932C0.279 0.949 0.312 0.959 0.346 0.961L0.373 0.964C0.457 0.97 0.543 0.97 0.627 0.964L0.655 0.961C0.688 0.959 0.721 0.949 0.75 0.932C0.779 0.915 0.805 0.892 0.824 0.864L0.839 0.842C0.887 0.772 0.93 0.698 0.966 0.622L0.978 0.597C0.992 0.567 1 0.534 1 0.5C1 0.466 0.992 0.433 0.978 0.403L0.966 0.378Z' />
          </clipPath>
        </defs>
      </svg>
    </>
  )
}
