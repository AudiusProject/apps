import { useEffect, useReducer } from 'react'

import { useQuery } from '@tanstack/react-query'

import { useWalletAddresses } from '~/api'
import { useQueryContext } from '~/api/tan-query/utils'
import { createCoinflowSession } from '~/services/coinflow'

const REFRESH_INTERVAL_MS = 25 * 60 * 1000
const EXPIRY_BUFFER_MS = 60 * 1000

export const useCoinflowSessionKey = ({
  wallet,
  environment,
  merchantId,
  enabled
}: {
  wallet: string | undefined
  environment: 'prod' | 'sandbox'
  merchantId: string
  enabled: boolean
}) => {
  const { solanaWalletService } = useQueryContext()
  const { data: addresses } = useWalletAddresses()
  const identityWallet = addresses?.web3User ?? addresses?.currentUser
  const [, render] = useReducer((value: number) => value + 1, 0)
  const isEnabled = enabled && !!wallet && !!identityWallet

  const query = useQuery({
    queryKey: [
      'coinflowSessionKey',
      merchantId,
      environment,
      addresses?.currentUser,
      identityWallet,
      wallet
    ],
    queryFn: async ({ signal }) => {
      if (!merchantId) throw new Error('Coinflow merchant is unavailable')
      const keypair = await solanaWalletService.getKeypair()
      if (
        !wallet ||
        !identityWallet ||
        !keypair ||
        keypair.publicKey.toBase58() !== wallet
      ) {
        throw new Error('Coinflow wallet is unavailable')
      }
      const { default: nacl } = await import('tweetnacl')
      const session = await createCoinflowSession({
        wallet,
        merchantId,
        environment,
        signal,
        signMessage: async (message) =>
          nacl.sign.detached(message, keypair.secretKey)
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
