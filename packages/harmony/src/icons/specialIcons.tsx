import { IconComponent, SVGIconProps } from '~harmony/components/icon'

import IconArtistBadgeSVG from '../assets/icons/ArtistBadge.svg'
import IconContestSignSVG from '../assets/icons/ContestSign.svg'
import IconCosignSVG from '../assets/icons/Cosign.svg'
import IconLabelBadgeSVG from '../assets/icons/LabelBadge.svg'
import IconMultiselectAddSVG from '../assets/icons/MultiselectAdd.svg'
import IconMultiselectRemoveSVG from '../assets/icons/MultiselectRemove.svg'
import TokenAUDIOPng from '../assets/icons/TokenAUDIO.png'
import TokenBonkPng from '../assets/icons/TokenBonk.png'
import TokenBronzePng from '../assets/icons/TokenBronze.png'
import TokenGoldPng from '../assets/icons/TokenGold.png'
import TokenNoTierPng from '../assets/icons/TokenNoTier.png'
import TokenPlatinumPng from '../assets/icons/TokenPlatinum.png'
import TokenSilverPng from '../assets/icons/TokenSilver.png'
import IconVerifiedSVG from '../assets/icons/Verified.svg'
import IconCcBySVG from '../assets/icons/ccBy.svg'
import IconCcCCSVG from '../assets/icons/ccCC.svg'
import IconCcNC_EUSVG from '../assets/icons/ccNC-EU.svg'
import IconCcNC_JPSVG from '../assets/icons/ccNC-JP.svg'
import IconCcNCSVG from '../assets/icons/ccNC.svg'
import IconCcNDSVG from '../assets/icons/ccND.svg'
import IconCcPDSVG from '../assets/icons/ccPD.svg'
import IconCcRemixSVG from '../assets/icons/ccRemix.svg'
import IconCcSASVG from '../assets/icons/ccSA.svg'
import IconCcSamplingSVG from '../assets/icons/ccSampling.svg'
import IconCcSamplingPlusSVG from '../assets/icons/ccSamplingPlus.svg'
import IconCcShareSVG from '../assets/icons/ccShare.svg'
import IconCcZeroSVG from '../assets/icons/ccZero.svg'
import IconFile3GASVG from '../assets/icons/file3GA.svg'
import IconFile3GPSVG from '../assets/icons/file3GP.svg'
import IconFileAACSVG from '../assets/icons/fileAAC.svg'
import IconFileAIFSVG from '../assets/icons/fileAIF.svg'
import IconFileAIFCSVG from '../assets/icons/fileAIFC.svg'
import IconFileAIFFSVG from '../assets/icons/fileAIFF.svg'
import IconFileAMRSVG from '../assets/icons/fileAMR.svg'
import IconFileAWBSVG from '../assets/icons/fileAWB.svg'
import IconFileFLACSVG from '../assets/icons/fileFLAC.svg'
import IconFileM4ASVG from '../assets/icons/fileM4A.svg'
import IconFileM4BSVG from '../assets/icons/fileM4B.svg'
import IconFileM4PSVG from '../assets/icons/fileM4P.svg'
import IconFileM4RSVG from '../assets/icons/fileM4R.svg'
import IconFileM4VSVG from '../assets/icons/fileM4V.svg'
import IconFileMP2SVG from '../assets/icons/fileMP2.svg'
import IconFileMP3SVG from '../assets/icons/fileMP3.svg'
import IconFileMP4SVG from '../assets/icons/fileMP4.svg'
import IconFileMPGASVG from '../assets/icons/fileMPGA.svg'
import IconFileOGASVG from '../assets/icons/fileOGA.svg'
import IconFileOGGSVG from '../assets/icons/fileOGG.svg'
import IconFileOGMSVG from '../assets/icons/fileOGM.svg'
import IconFileOGVSVG from '../assets/icons/fileOGV.svg'
import IconFileOGXSVG from '../assets/icons/fileOGX.svg'
import IconFileOPUSSVG from '../assets/icons/fileOPUS.svg'
import IconFileSPXSVG from '../assets/icons/fileSPX.svg'
import IconFileTSSVG from '../assets/icons/fileTS.svg'
import IconFileTSASVG from '../assets/icons/fileTSA.svg'
import IconFileTSVSVG from '../assets/icons/fileTSV.svg'
import IconFileUnknownSVG from '../assets/icons/fileUnknown.svg'
import IconFileWAVSVG from '../assets/icons/fileWAV.svg'
import IconFileWAVESVG from '../assets/icons/fileWAVE.svg'
import IconFileWEBMSVG from '../assets/icons/fileWEBM.svg'
import IconFileXWMASVG from '../assets/icons/fileXWMA.svg'
import IconPlaybackRate0_5xSVG from '../assets/icons/iconPlaybackRate0_5x.svg'
import IconPlaybackRate0_8xSVG from '../assets/icons/iconPlaybackRate0_8x.svg'
import IconPlaybackRate0_9xSVG from '../assets/icons/iconPlaybackRate0_9x.svg'
import IconPlaybackRate1_1xSVG from '../assets/icons/iconPlaybackRate1_1x.svg'
import IconPlaybackRate1_2xSVG from '../assets/icons/iconPlaybackRate1_2x.svg'
import IconPlaybackRate1_5xSVG from '../assets/icons/iconPlaybackRate1_5x.svg'
import IconPlaybackRate1xSVG from '../assets/icons/iconPlaybackRate1x.svg'
import IconPlaybackRate2_5xSVG from '../assets/icons/iconPlaybackRate2_5x.svg'
import IconPlaybackRate2xSVG from '../assets/icons/iconPlaybackRate2x.svg'
import IconPlaybackRate3xSVG from '../assets/icons/iconPlaybackRate3x.svg'
import { createImageIcon } from '../utils/createImageIcon'

export const IconContestSign = IconContestSignSVG as IconComponent
export const IconCosign = IconCosignSVG as IconComponent
export const IconArtistBadge = IconArtistBadgeSVG as IconComponent
export const IconLabelBadge = IconLabelBadgeSVG as IconComponent
export const IconMultiselectAdd = IconMultiselectAddSVG as IconComponent
export const IconMultiselectRemove = IconMultiselectRemoveSVG as IconComponent

export const IconVerified = ((props: SVGIconProps) => (
  <IconVerifiedSVG color='active' colorSecondary='white' {...props} />
)) as IconComponent
export const IconTokenNoTier = createImageIcon(TokenNoTierPng)
export const IconTokenBronze = createImageIcon(TokenBronzePng)
export const IconTokenGold = createImageIcon(TokenGoldPng)
export const IconTokenPlatinum = createImageIcon(TokenPlatinumPng)
export const IconTokenSilver = createImageIcon(TokenSilverPng)
export const IconTokenBonk = createImageIcon(TokenBonkPng)

export const IconFile3GA = IconFile3GASVG as IconComponent
export const IconFile3GP = IconFile3GPSVG as IconComponent
export const IconFileAAC = IconFileAACSVG as IconComponent
export const IconFileAIF = IconFileAIFSVG as IconComponent
export const IconFileAIFF = IconFileAIFFSVG as IconComponent
export const IconFileAMR = IconFileAMRSVG as IconComponent
export const IconFileAWB = IconFileAWBSVG as IconComponent
export const IconFileFLAC = IconFileFLACSVG as IconComponent
export const IconFileM4A = IconFileM4ASVG as IconComponent
export const IconFileM4B = IconFileM4BSVG as IconComponent
export const IconFileM4P = IconFileM4PSVG as IconComponent
export const IconFileM4R = IconFileM4RSVG as IconComponent
export const IconFileM4V = IconFileM4VSVG as IconComponent
export const IconFileMP2 = IconFileMP2SVG as IconComponent
export const IconFileMP3 = IconFileMP3SVG as IconComponent
export const IconFileMP4 = IconFileMP4SVG as IconComponent
export const IconFileMPGA = IconFileMPGASVG as IconComponent
export const IconFileOGA = IconFileOGASVG as IconComponent
export const IconFileOGG = IconFileOGGSVG as IconComponent
export const IconFileOGM = IconFileOGMSVG as IconComponent
export const IconFileOGV = IconFileOGVSVG as IconComponent
export const IconFileOGX = IconFileOGXSVG as IconComponent
export const IconFileAIFC = IconFileAIFCSVG as IconComponent
export const IconFileOPUS = IconFileOPUSSVG as IconComponent
export const IconFileSPX = IconFileSPXSVG as IconComponent
export const IconFileTS = IconFileTSSVG as IconComponent
export const IconFileTSA = IconFileTSASVG as IconComponent
export const IconFileTSV = IconFileTSVSVG as IconComponent
export const IconFileUnknown = IconFileUnknownSVG as IconComponent
export const IconFileWAV = IconFileWAVSVG as IconComponent
export const IconFileWAVE = IconFileWAVESVG as IconComponent
export const IconFileWEBM = IconFileWEBMSVG as IconComponent
export const IconFileXWMA = IconFileXWMASVG as IconComponent

export const IconCcBy = IconCcBySVG as IconComponent
export const IconCcCC = IconCcCCSVG as IconComponent
export const IconCcNC_EU = IconCcNC_EUSVG as IconComponent
export const IconCcNC_JP = IconCcNC_JPSVG as IconComponent
export const IconCcNC = IconCcNCSVG as IconComponent
export const IconCcND = IconCcNDSVG as IconComponent
export const IconCcPD = IconCcPDSVG as IconComponent
export const IconCcRemix = IconCcRemixSVG as IconComponent
export const IconCcSA = IconCcSASVG as IconComponent
export const IconCcSampling = IconCcSamplingSVG as IconComponent
export const IconCcSamplingPlus = IconCcSamplingPlusSVG as IconComponent
export const IconCcShare = IconCcShareSVG as IconComponent
export const IconCcZero = IconCcZeroSVG as IconComponent

export const IconPlaybackRate0_5x = IconPlaybackRate0_5xSVG as IconComponent
export const IconPlaybackRate0_8x = IconPlaybackRate0_8xSVG as IconComponent
export const IconPlaybackRate0_9x = IconPlaybackRate0_9xSVG as IconComponent
export const IconPlaybackRate1x = IconPlaybackRate1xSVG as IconComponent
export const IconPlaybackRate1_1x = IconPlaybackRate1_1xSVG as IconComponent
export const IconPlaybackRate1_2x = IconPlaybackRate1_2xSVG as IconComponent
export const IconPlaybackRate1_5x = IconPlaybackRate1_5xSVG as IconComponent
export const IconPlaybackRate2x = IconPlaybackRate2xSVG as IconComponent
export const IconPlaybackRate2_5x = IconPlaybackRate2_5xSVG as IconComponent
export const IconPlaybackRate3x = IconPlaybackRate3xSVG as IconComponent

export const IconTokenAUDIO = createImageIcon(TokenAUDIOPng)
