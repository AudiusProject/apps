import { initializeDiscoveryDb } from '@pedalboard/basekit'
import type { SolKeypairs } from '@pedalboard/storage'
import { Keypair } from '@solana/web3.js'
import { Logger } from 'pino'

import { config } from '../../config'

const db = initializeDiscoveryDb(config.discoveryDbConnectionString)

export const getKeypair = async (logger: Logger): Promise<Keypair> => {
  const [deleted] = await db<SolKeypairs>('sol_keypairs')
    .whereIn('public_key', function () {
      this.select('public_key').from('sol_keypairs').limit(1)
    })
    .delete()
    .returning(['private_key'])
  if (!deleted) {
    logger.warn('No keypair found, generating random one instead')
    return Keypair.generate()
  }

  return Keypair.fromSecretKey(Uint8Array.from(deleted.private_key))
}
