import { initializeDiscoveryDb } from '@pedalboard/basekit'
import { AssociatedWallets, Table, WalletChain } from '@pedalboard/storage'
import { VersionedTransaction } from '@solana/web3.js'

import { config } from '../../config'
import { logger } from '../../logger'

const db = initializeDiscoveryDb(config.discoveryDbConnectionString)

export const associateExternalWallet = async (
  transaction: VersionedTransaction,
  userId: number
) => {
  try {
    const wallet = transaction.message.staticAccountKeys[0]
    // Check if wallet already exists for another user and remove it
    const existingWallets = await db<AssociatedWallets>(Table.AssociatedWallets)
      .where('wallet', '=', wallet)
      .where('chain', '=', WalletChain.Sol)
      .where('is_current', '=', true)
    for (const existingWallet of existingWallets) {
      if (existingWallet.user_id !== userId) {
        // Remove wallet from other user
        await db<AssociatedWallets>(Table.AssociatedWallets)
          .where('id', '=', existingWallet.id)
          .update({ is_current: false })
      }
    }

    // Insert new wallet association
    await db<AssociatedWallets>(Table.AssociatedWallets).insert({
      user_id: userId,
      wallet: wallet.toBase58(),
      chain: WalletChain.Sol,
      is_current: true,
      is_delete: false
    })

    return true
  } catch (error) {
    logger.error({ error }, 'Error associating external wallet')
    return false
  }
}
