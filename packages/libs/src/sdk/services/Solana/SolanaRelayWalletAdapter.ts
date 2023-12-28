import type {
  SupportedTransactionVersions,
  TransactionOrVersionedTransaction,
  WalletName,
  WalletReadyState
} from '@solana/wallet-adapter-base'
import type { PublicKey } from '@solana/web3.js'
import type { SolanaRelay } from './SolanaRelay'
import type { SolanaWalletAdapter } from './types'

/**
 * Wallet adapter that uses the Solana Relay Plugin on Discovery Node.
 *
 * Implementing this interface allows consumers to choose to pay for their own
 * transactions rather than using our relay, simply by using their own wallet
 * app's existing wallet adapter in place of this class.
 *
 * @see {@link https://github.com/solana-labs/wallet-standard/blob/master/WALLET.md wallet-standard}
 * @see {@link https://github.com/solana-labs/wallet-adapter/blob/master/packages/wallets/phantom/src/adapter.ts Phantom Wallet Adapter}
 */
export class SolanaRelayWalletAdapter implements SolanaWalletAdapter {
  public readonly name =
    'AudiusSolanaWallet' as WalletName<'AudiusSolanaWallet'>
  public readonly url = ''
  public readonly icon = ''
  public readonly readyState: WalletReadyState =
    'Loadable' as WalletReadyState.Loadable
  public readonly supportedTransactionVersions?: SupportedTransactionVersions

  private readonly solanaRelay: SolanaRelay

  private _publicKey: PublicKey | null = null
  private _connecting = false
  private _connected = false

  constructor({ solanaRelay }: { solanaRelay: SolanaRelay }) {
    this.solanaRelay = solanaRelay
  }

  public get publicKey() {
    return this._publicKey
  }

  public get connecting() {
    return this._connecting
  }

  public get connected() {
    return this._connected
  }

  public async autoConnect() {
    await this.connect()
  }

  /**
   * On connection, grabs the fee payer from the Discovery Node plugin.
   */
  public async connect() {
    this._connecting = true
    this._publicKey = await this.solanaRelay.getFeePayer()
    if (!this._publicKey) {
      throw new Error(
        'Failed to connect SolanaRelayWalletAdapter: Failed to get fee payer.'
      )
    }
    this._connecting = false
    this._connected = true
  }

  public async disconnect() {
    this._connected = false
    this._publicKey = null
  }

  /**
   * Sends a transaction using the relay to Discovery Node.
   * @param transaction the transaction to send.
   */
  public async sendTransaction(
    transaction: TransactionOrVersionedTransaction<
      this['supportedTransactionVersions']
    >
  ) {
    const { signature } = await this.solanaRelay.relay({ transaction })
    return signature
  }
}
