const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function encodeBase58(bytes: Uint8Array): string {
  let result = ''
  let value = BigInt(
    '0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  )
  while (value > 0n) {
    result = BASE58_ALPHABET[Number(value % 58n)] + result
    value /= 58n
  }
  for (const b of bytes) {
    if (b !== 0) break
    result = '1' + result
  }
  return result
}

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

  /** Connect a wallet, sign the auth message, and store the credential. */
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
      signature: encodeBase58(sigBytes)
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
