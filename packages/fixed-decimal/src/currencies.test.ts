import { describe, it, expect } from 'vitest'

import { AUDIO, AudioWei, USDC, UsdcWei, wAUDIO } from './currencies'

describe('Currency tests', function () {
  it('can convert AUDIO to wAUDIO', function () {
    const audio = '123.123456789012345678'
    expect(wAUDIO(AUDIO(audio)).toString()).toBe('123.12345678')
  })

  it('can convert wAUDIO to AUDIO', function () {
    const audio = '123.123456789012345678'
    expect(AUDIO(wAUDIO(audio)).toString()).toBe('123.123456780000000000')
  })

  it('can convert USDC to USD', function () {
    const usdc = '123.123456'
    expect(USDC(usdc).toFixed(2)).toBe('123.12')
  })

  it('can convert USD to USDC', function () {
    const usd = '123.12'
    expect(USDC(usd).toString()).toBe('123.120000')
  })

  it('typechecks method signatures', function () {
    const onlyUsdcWei = (a: UsdcWei) => {
      return a === BigInt(1000000)
    }
    // @ts-expect-error
    onlyUsdcWei(AUDIO(1).value)
    onlyUsdcWei(USDC(1).value)
  })

  it('typechecks constructor bigint', function () {
    // @ts-expect-error
    USDC(BigInt(1) as AudioWei)
    USDC(BigInt(2))
    USDC(BigInt(3) as UsdcWei)
  })

  it('defaults to two decimals', function () {
    expect(USDC(1.234567).toLocaleString()).toBe('$1.23')
    expect(USDC(-1.234567).toLocaleString()).toBe('-$1.23')
  })
})
