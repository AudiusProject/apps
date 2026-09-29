import { useEffect, useReducer } from 'react'

import { useQuery } from '@tanstack/react-query'
import nacl from 'tweetnacl'

import { useWalletAddresses } from '~/api'
import { useQueryContext } from '~/api/tan-query/utils'

const REFRESH_INTERVAL_MS = 25 * 60 * 1000
const EXPIRY_BUFFER_MS = 60 * 1000

/** Keep Coinflow credentials in memory and scoped to the active wallet. */
export const useCoinflowSessionKey = ({
  wallet,
  environment,
  enabled
}: {
  wallet: string | undefined
  environment: 'prod' | 'sandbox'
  enabled: boolean
}) => {
  const { identityService, solanaWalletService } = useQueryContext()
  const { data: addresses } = useWalletAddresses()
  const identityWallet = addresses?.web3User ?? addresses?.currentUser
  const [, render] = useReducer((value: number) => value + 1, 0)
  const isEnabled = enabled && !!wallet && !!identityWallet

  const query = useQuery({
    queryKey: [
      'coinflowSessionKey',
      identityService.identityServiceEndpoint,
      environment,
      addresses?.currentUser,
      identityWallet,
      wallet
    ],
    queryFn: async () => {
      const keypair = await solanaWalletService.getKeypair()
      if (
        !wallet ||
        !identityWallet ||
        !keypair ||
        keypair.publicKey.toBase58() !== wallet
      ) {
        throw new Error('Coinflow wallet is unavailable')
      }
      const timestamp = Date.now()
      const message = `Audius Coinflow session:${identityWallet.toLowerCase()}:${wallet}:${environment}:${timestamp}`
      const signature = Buffer.from(
        nacl.sign.detached(
          new Uint8Array(Buffer.from(message)),
          keypair.secretKey
        )
      ).toString('base64')
      const session = await identityService.createCoinflowSessionKey({
        wallet,
        signature,
        timestamp,
        environment
      })
      if (
        !session.key ||
        !Number.isFinite(session.expiresAt) ||
        session.expiresAt <= Date.now() + EXPIRY_BUFFER_MS
      ) {
        throw new Error('Coinflow session is invalid or expired')
      }
      return session
    },
    enabled: isEnabled,
    staleTime: REFRESH_INTERVAL_MS,
    gcTime: 0,
    retry: 1,
    refetchInterval: isEnabled ? REFRESH_INTERVAL_MS : false
  })

  const expiresAt = query.data?.expiresAt
  useEffect(() => {
    if (!isEnabled || !expiresAt) return
    // If refresh fails, stop using the previous key before it expires.
    const timer = setTimeout(
      render,
      Math.max(0, expiresAt - Date.now() - EXPIRY_BUFFER_MS)
    )
    return () => clearTimeout(timer)
  }, [expiresAt, isEnabled])

  return {
    sessionKey:
      isEnabled && expiresAt && expiresAt > Date.now() + EXPIRY_BUFFER_MS
        ? query.data?.key
        : undefined,
    isPending: query.isPending,
    isError: query.isError,
    isFetching: query.isFetching,
    retry: query.refetch
  }
}
