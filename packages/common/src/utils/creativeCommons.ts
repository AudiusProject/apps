import { Nullable } from './typeUtils'

export const ALL_RIGHTS_RESERVED_TYPE = 'All rights reserved'
const ALL_RIGHTS_RESERVED_DESC = ''
const ALL_RIGHTS_RESERVED = {
  licenseType: ALL_RIGHTS_RESERVED_TYPE,
  licenseDescription: ALL_RIGHTS_RESERVED_DESC
} as const

export const BY_TYPE = 'Attribution CC BY'
const BY_DESC =
  'This license lets others distribute, remix, tweak, and build upon your work, even commercially, as long as they credit you for the original creation. This is the most accommodating of licenses offered. Recommended for maximum dissemination and use of licensed materials.'
const BY = { licenseType: BY_TYPE, licenseDescription: BY_DESC } as const

export const BY_NC_TYPE = 'Attribution-NonCommercial CC BY-NC'
const BY_NC_DESC =
  'This license lets others remix, tweak, and build upon your work non-commercially, and although their new works must also acknowledge you and be non-commercial, they don’t have to license their derivative works on the same terms.'
const BY_NC = {
  licenseType: BY_NC_TYPE,
  licenseDescription: BY_NC_DESC
} as const

export const BY_NC_ND_TYPE = 'Attribution-NonCommercial-NoDerivs CC BY-NC-ND'
const BY_NC_ND_DESC =
  'This license is the most restrictive of our six main licenses, only allowing others to download your works and share them with others as long as they credit you, but they can’t change them in any way or use them commercially.'
const BY_NC_ND = {
  licenseType: BY_NC_ND_TYPE,
  licenseDescription: BY_NC_ND_DESC
} as const

export const BY_NC_SA_TYPE = 'Attribution-NonCommercial-ShareAlike CC BY-NC-SA'
const BY_NC_SA_DESC =
  'This license lets others remix, tweak, and build upon your work non-commercially, as long as they credit you and license their new creations under the identical terms.'
const BY_NC_SA = {
  licenseType: BY_NC_SA_TYPE,
  licenseDescription: BY_NC_SA_DESC
} as const

export const BY_ND_TYPE = 'Attribution-NoDerivs CC BY-ND'
const BY_ND_DESC =
  'This license allows for redistribution, commercial and non-commercial, as long as it is passed along unchanged and in whole, with credit to you.'
const BY_ND = {
  licenseType: BY_ND_TYPE,
  licenseDescription: BY_ND_DESC
} as const

export const BY_SA_TYPE = 'Attribution ShareAlike CC BY-SA'
const BY_SA_DESC =
  'This license lets others remix, tweak, and build upon your work even for commercial purposes, as long as they credit you and license their new creations under the identical terms. This license is often compared to “copyleft” free and open source software licenses. All new works based on yours will carry the same license, so any derivatives will also allow commercial use. This is the license used by Wikipedia, and is recommended for materials that would benefit from incorporating content from Wikipedia and similarly licensed projects.'
const BY_SA = {
  licenseType: BY_SA_TYPE,
  licenseDescription: BY_SA_DESC
} as const

const ALL_LICENSES = {
  [ALL_RIGHTS_RESERVED_TYPE]: ALL_RIGHTS_RESERVED_DESC,
  [BY_TYPE]: BY_DESC,
  [BY_NC_TYPE]: BY_NC_DESC,
  [BY_NC_ND_TYPE]: BY_NC_ND_DESC,
  [BY_NC_SA_TYPE]: BY_NC_SA_DESC,
  [BY_ND_TYPE]: BY_ND_DESC,
  [BY_SA_TYPE]: BY_SA_DESC
}

export type License = keyof typeof ALL_LICENSES

export const computeLicense = (
  allowAttribution: boolean,
  commercialUse: boolean,
  derivativeWorks: Nullable<boolean> = null
) => {
  if (allowAttribution && !commercialUse && derivativeWorks === null)
    return BY_NC
  if (allowAttribution && !commercialUse && !derivativeWorks) return BY_NC_ND
  if (allowAttribution && !commercialUse && derivativeWorks) return BY_NC_SA

  if (allowAttribution && commercialUse && derivativeWorks === null) return BY
  if (allowAttribution && commercialUse && !derivativeWorks) return BY_ND
  if (allowAttribution && commercialUse && derivativeWorks) return BY_SA

  return ALL_RIGHTS_RESERVED
}

const variables = (
  allowAttribution: Nullable<boolean>,
  commercialUse: Nullable<boolean>,
  derivativeWorks: Nullable<boolean>
) => ({
  allowAttribution,
  commercialUse,
  derivativeWorks
})

export const computeLicenseVariables = (licenseType: License) => {
  switch (licenseType) {
    case BY_NC_TYPE:
      return variables(true, false, null)
    case BY_NC_ND_TYPE:
      return variables(true, false, false)
    case BY_NC_SA_TYPE:
      return variables(true, false, true)
    case BY_TYPE:
      return variables(true, true, null)
    case BY_ND_TYPE:
      return variables(true, true, false)
    case BY_SA_TYPE:
      return variables(true, true, true)
    case ALL_RIGHTS_RESERVED_TYPE:
      return variables(false, false, false)
    default:
      return variables(false, false, false)
  }
}

export const getDescriptionForType = (licenseType: License) => {
  return licenseType in ALL_LICENSES
    ? ALL_LICENSES[licenseType]
    : ALL_RIGHTS_RESERVED_DESC
}
