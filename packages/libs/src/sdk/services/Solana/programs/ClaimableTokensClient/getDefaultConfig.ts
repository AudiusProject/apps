import { PublicKey } from '@solana/web3.js'

import type { SdkServicesConfig } from '../../../../config/types'

import type { ClaimableTokensConfigInternal } from './types'

export const getDefaultClaimableTokensConfig = (
  config: SdkServicesConfig
): ClaimableTokensConfigInternal => ({
  programId: new PublicKey(config.solana.claimableTokensProgramAddress),
  rpcEndpoint: config.solana.rpcEndpoint,
  mints: {
    wAUDIO: new PublicKey(config.solana.wAudioTokenMint),
    USDC: new PublicKey(config.solana.usdcTokenMint)
  }
})
