export const createCoinflowSession = async ({
  wallet,
  merchantId,
  environment,
  signMessage,
  signal
}: {
  wallet: string
  merchantId: string
  environment: 'prod' | 'sandbox'
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
  signal?: AbortSignal
}) => {
  const baseUrl =
    environment === 'prod'
      ? 'https://api.coinflow.cash'
      : 'https://api-sandbox.coinflow.cash'
  const headers = {
    'x-coinflow-auth-wallet': wallet,
    'x-coinflow-auth-blockchain': 'solana',
    'x-coinflow-auth-merchant-id': merchantId
  }
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) abort()
  signal?.addEventListener('abort', abort)
  const timeout = setTimeout(abort, 15000)
  const requestedAt = Date.now()

  try {
    const challengeResponse = await fetch(`${baseUrl}/api/auth`, {
      headers,
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal
    })
    if (!challengeResponse.ok) {
      throw new Error(
        `Coinflow authentication failed (${challengeResponse.status})`
      )
    }
    const challenge = await challengeResponse.json()
    if (typeof challenge?.message !== 'string' || !challenge.message) {
      throw new Error('Coinflow authentication message is missing')
    }
    const signature = await signMessage(
      new Uint8Array(Buffer.from(challenge.message))
    )
    const { default: bs58 } = await import('bs58')
    const sessionResponse = await fetch(`${baseUrl}/api/auth/session-key`, {
      headers: {
        ...headers,
        'x-coinflow-auth-signed-message': bs58.encode(signature)
      },
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal
    })
    if (!sessionResponse.ok) {
      throw new Error(
        `Coinflow session request failed (${sessionResponse.status})`
      )
    }
    const session = await sessionResponse.json()
    if (typeof session?.key !== 'string' || !session.key) {
      throw new Error('Coinflow session key is missing')
    }
    return { key: session.key, expiresAt: requestedAt + 30 * 60 * 1000 }
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
