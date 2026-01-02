// Export all SVG icons from the single icons.tsx file
// Each SVG icon is in its own file for optimal tree-shaking
export * from './icons'
// Image-based icons (PNG/JPG) are still exported from original files
export { IconLogoCircleUSDCPng, IconLogoWhiteBackground } from './logos'
export {
  IconTokenNoTier,
  IconTokenBronze,
  IconTokenGold,
  IconTokenPlatinum,
  IconTokenSilver,
  IconTokenBonk,
  IconTokenAUDIO
} from './specialIcons'
export * from './animatedIcons'
