export type SolWalletCredential = {
  publicKey: string
  message: string
  signature: string
}

export function createSolWalletSignatureMessage() {
  const timestamp = Date.now()
  const message = `audius:sol-wallet:${timestamp}`
  const messageBytes = new TextEncoder().encode(message)
  return { message, messageBytes, timestamp }
}

export class SolWallet {
  private credential: SolWalletCredential | null = null

  setCredential(credential: SolWalletCredential) {
    this.credential = credential
  }

  clearCredential() {
    this.credential = null
  }

  getCredential(): SolWalletCredential | null {
    return this.credential
  }

  isAuthenticated(): boolean {
    return this.credential !== null
  }
}
