/** Credential tuple produced by signing an SDK-generated message with a Solana wallet. */
export type WalletAuthCredential = {
  /** Base58-encoded Solana public key */
  publicKey: string
  /** The message that was signed (from `createAuthMessage`) */
  message: string
  /** Base58-encoded ed25519 signature */
  signature: string
}
