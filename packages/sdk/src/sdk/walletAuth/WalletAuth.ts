import type { WalletAuthCredential } from './types'

/**
 * Manages Solana wallet authentication credentials.
 *
 * The SDK does not connect wallets directly — apps use whatever wallet
 * adapter they prefer, sign the message from `createAuthMessage()`, and
 * hand the credential here. The SDK then injects the appropriate headers
 * into all API requests via middleware.
 */
export class WalletAuth {
  private credential: WalletAuthCredential | null = null

  /** Store a signed wallet credential. */
  setCredential(credential: WalletAuthCredential) {
    this.credential = credential
  }

  /** Clear the stored credential (disconnect). */
  clearCredential() {
    this.credential = null
  }

  /** Returns the current credential, or null if not authenticated. */
  getCredential(): WalletAuthCredential | null {
    return this.credential
  }

  /** Whether a wallet credential is currently set. */
  isAuthenticated(): boolean {
    return this.credential !== null
  }
}
