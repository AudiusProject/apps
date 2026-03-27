/**
 * Creates the canonical message for Solana wallet authentication.
 *
 * The message embeds a timestamp so the API can enforce expiry in the future.
 * Apps sign this with the user's wallet and pass the result to
 * `WalletAuth.setCredential()`.
 */
export function createAuthMessage() {
  const timestamp = Date.now()
  const message = `audius:wallet-auth:${timestamp}`
  const messageBytes = new TextEncoder().encode(message)
  return { message, messageBytes, timestamp }
}
