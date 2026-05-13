import type { ArtistCoins } from '@pedalboard/storage'

import { config } from '../../config'
import { db } from '../../db'

export const getAllowedMints = async (): Promise<string[]> => {
  const rows = await db<ArtistCoins>('artist_coins').select('mint')
  const artistCoinMints = rows.map((row) => row.mint)
  return [config.usdcMintAddress, config.waudioMintAddress, ...artistCoinMints]
}
