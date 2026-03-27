export type SolanaWalletCredential = {
  publicKey: string
  message: string
  signature: string
}

export function createSolanaWalletSignatureMessage() {
  const timestamp = Date.now()
  const message = `audius:solana-wallet:${timestamp}`
  const messageBytes = new TextEncoder().encode(message)
  return { message, messageBytes, timestamp }
}

export class SolanaWallet {
  private credential: SolanaWalletCredential | null = null

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
