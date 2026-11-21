import type { Connection } from '@solana/web3.js'

import { createLazyLoader, type PublicInterface } from '../../../utils/lazy'

import type { SolanaClient } from './SolanaClient'
import type { SolanaClientConfig } from './types'

type Client = SolanaClient

/**
 * Same interface as SolanaClient, but the client (and @solana/web3.js) is only
 * loaded on the first method call.
 *
 * `connection` can only be read synchronously once the client has loaded. Use
 * `await getConnection()` instead.
 */
export class LazySolanaClient implements PublicInterface<Client> {
  private readonly loader

  constructor(config: SolanaClientConfig) {
    this.loader = createLazyLoader(async () => {
      const { SolanaClient } = await import('./SolanaClient')
      return new SolanaClient(config)
    })
  }

  /**
   * The Solana RPC client, once loaded.
   * @throws if the client hasn't loaded yet. Use `getConnection()` instead.
   */
  get connection(): Connection {
    const client = this.loader.peek()
    if (!client) {
      this.loader.get().catch(() => {})
      throw new Error(
        'solanaClient.connection is not available until the Solana client has loaded. Use `await solanaClient.getConnection()` instead.'
      )
    }
    return client.connection
  }

  async getConnection() {
    return (await this.loader.get()).getConnection()
  }

  async buildTransaction(...args: Parameters<Client['buildTransaction']>) {
    return (await this.loader.get()).buildTransaction(...args)
  }

  async sendTransaction(...args: Parameters<Client['sendTransaction']>) {
    return (await this.loader.get()).sendTransaction(...args)
  }

  async confirmAllTransactions(
    ...args: Parameters<Client['confirmAllTransactions']>
  ) {
    return (await this.loader.get()).confirmAllTransactions(...args)
  }

  async getFeePayer() {
    return (await this.loader.get()).getFeePayer()
  }

  async getInstructions(...args: Parameters<Client['getInstructions']>) {
    return (await this.loader.get()).getInstructions(...args)
  }

  async getLookupTableAccounts(
    ...args: Parameters<Client['getLookupTableAccounts']>
  ) {
    return (await this.loader.get()).getLookupTableAccounts(...args)
  }
}
