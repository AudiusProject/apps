import { hexToRgb } from './hexToRgb'

describe('hexToRgb', () => {
  it('converts 6 digit hex', () => {
    expect(hexToRgb('#0F0F0F')).toBe('rgb(15,15,15)')
  })

  it('converts 3 digit hex', () => {
    expect(hexToRgb('#fff')).toBe('rgb(255,255,255)')
  })

  it('drops alpha from 8 digit hex', () => {
    expect(hexToRgb('#30354AFF')).toBe('rgb(48,53,74)')
  })

  it('passes through non-hex values', () => {
    expect(hexToRgb('rgb(1,2,3)')).toBe('rgb(1,2,3)')
    expect(hexToRgb(undefined)).toBe(undefined)
  })
})
