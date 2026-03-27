import bs58 from 'bs58'

export type SolanaWalletCredential = {
  publicKey: string
  message: string
  signature: string
}

/**
 * Minimal interface for a Solana wallet provider (Phantom, Solflare, etc.).
 * Apps pass their connected wallet to `SolanaWallet.auth()`.
 */
export type SolanaWalletProvider = {
  connect(): Promise<{ publicKey: { toString(): string } }>
  signMessage(
    message: Uint8Array,
    encoding: string
  ): Promise<{ signature: Uint8Array }>
}

export function createSolanaWalletSignatureMessage() {
  const timestamp = Date.now()
  const message = `audius:solana-wallet:${timestamp}`
  const messageBytes = new TextEncoder().encode(message)
  return { message, messageBytes, timestamp }
}

export class SolanaWallet {
  private credential: SolanaWalletCredential | null = null

  async auth(provider: SolanaWalletProvider) {
    const { publicKey } = await provider.connect()
    const { message, messageBytes } = createSolanaWalletSignatureMessage()
    const { signature: sigBytes } = await provider.signMessage(
      messageBytes,
      'utf8'
    )
    this.credential = {
      publicKey: publicKey.toString(),
      message,
      signature: bs58.encode(sigBytes)
    }
    return { publicKey: this.credential.publicKey }
  }

  setCredential(credential: SolanaWalletCredential) {
    this.credential = credential
  }

  clearCredential() {
    this.credential = null
  }

  getCredential(): SolanaWalletCredential | null {
    return this.credential
  }

  isAuthenticated(): boolean {
    return this.credential !== null
  }
}
