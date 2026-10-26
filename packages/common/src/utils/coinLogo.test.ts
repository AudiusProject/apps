import { describe, expect, it } from 'vitest'

import { getCoinLogoUrl } from './coinLogo'

const CID = 'baeaaaiqsecwikb3rxnjr4txcptwvtlpdj6et6bkkz7vo5giyy35xnl5vxxbxk'
const NODE_URL = `https://creatornode.audius.co/content/${CID}`

describe('getCoinLogoUrl', () => {
  it('requests a variant sized for the display at 3x', () => {
    expect(getCoinLogoUrl(NODE_URL, 16)).toBe(`${NODE_URL}/150x150.jpg`)
    expect(getCoinLogoUrl(NODE_URL, 50)).toBe(`${NODE_URL}/150x150.jpg`)
    expect(getCoinLogoUrl(NODE_URL, 64)).toBe(`${NODE_URL}/480x480.jpg`)
    expect(getCoinLogoUrl(NODE_URL, 200)).toBe(`${NODE_URL}/1000x1000.jpg`)
  })

  it('tolerates a trailing slash', () => {
    expect(getCoinLogoUrl(`${NODE_URL}/`, 24)).toBe(`${NODE_URL}/150x150.jpg`)
  })

  it('leaves URLs it cannot resize unchanged', () => {
    const irys =
      'https://gateway.irys.xyz/FRdFgDGxVZC9HsdRkWQ3CKCyi6icxvxT1ENWgnk1By4y'
    const asset = 'https://audius.co/assets/TokenAUDIO-B9fxmOIn.png'
    const variant = `${NODE_URL}/480x480.jpg`
    expect(getCoinLogoUrl(irys, 16)).toBe(irys)
    expect(getCoinLogoUrl(asset, 16)).toBe(asset)
    expect(getCoinLogoUrl(variant, 16)).toBe(variant)
  })

  it('passes through empty values', () => {
    expect(getCoinLogoUrl(undefined, 16)).toBeUndefined()
    expect(getCoinLogoUrl(null, 16)).toBeNull()
    expect(getCoinLogoUrl('', 16)).toBe('')
  })
})
