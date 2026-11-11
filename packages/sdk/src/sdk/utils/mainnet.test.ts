import { mainnet as viemMainnet } from 'viem/chains'
import { describe, expect, it } from 'vitest'

import { mainnet } from './mainnet'

describe('mainnet', () => {
  it('matches the viem/chains definition', () => {
    expect(mainnet).toEqual(viemMainnet)
  })
})
