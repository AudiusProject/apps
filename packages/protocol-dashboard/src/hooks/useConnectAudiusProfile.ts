import { useState, useCallback } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { BrowserProvider } from 'ethers'
import { useDispatch } from 'react-redux'

import { getDashboardWalletUserQueryKey } from 'hooks/useDashboardWalletUsers'
import { audiusSdk as sdk, apiEndpoint } from 'services/Audius/sdk'
import { disableAudiusProfileRefetch } from 'store/account/slice'

const API_KEY = '2cc593fc814461263d282a84286fd4f72c79562e'

const AUDIUS_URL = import.meta.env.VITE_AUDIUS_URL || 'https://audius.co'
const OAUTH_BASE_URL = `${AUDIUS_URL}/oauth/auth`

// --- PKCE helpers (inlined from @audius/sdk since they aren't exported) ---

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function generateCodeVerifier(): string {
  const arr = new Uint8Array(32)
  globalThis.crypto.getRandomValues(arr)
  return base64url(arr)
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const hash = await globalThis.crypto.subtle.digest('SHA-256', data)
  return base64url(new Uint8Array(hash))
}

function generateState(): string {
  const arr = new Uint8Array(16)
  globalThis.crypto.getRandomValues(arr)
  return base64url(arr)
}

// --- End PKCE helpers ---

type OAuthPopupMessage = {
  state?: string
  userHandle?: string
  userId?: string
  code?: string
}

export const useConnectAudiusProfile = ({
  wallet,
  walletProvider,
  onSuccess
}: {
  wallet: string
  walletProvider?: any
  onSuccess: () => void
}) => {
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const [isWaiting, setIsWaiting] = useState(false)

  const connect = useCallback(async () => {
    setIsWaiting(true)

    try {
      // 1. Generate PKCE params
      const state = generateState()
      const codeVerifier = generateCodeVerifier()
      const codeChallenge = await generateCodeChallenge(codeVerifier)
      const origin = window.location.origin

      // 2. Construct OAuth URL with write scope + dashboard wallet tx
      const params = new URLSearchParams({
        scope: 'write',
        api_key: API_KEY,
        state,
        redirect_uri: 'postMessage',
        origin,
        response_type: 'code',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        display: 'popup',
        tx: 'connect_dashboard_wallet',
        wallet
      })
      const oauthUrl = `${OAUTH_BASE_URL}?${params.toString()}`

      // 3. Open popup
      const popup = window.open(
        oauthUrl,
        '',
        'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=375, height=785, top=100, left=100'
      )
      if (!popup) {
        throw new Error(
          'The login popup was blocked. Please allow popups for this site and try again.'
        )
      }

      // 4. Wait for messages from popup
      const oauthOrigin = new URL(OAUTH_BASE_URL).origin

      // First message: user handle (after user authenticates)
      const { userHandle } = await new Promise<{
        userHandle: string
      }>((resolve, reject) => {
        const closeCheck = setInterval(() => {
          if (popup.closed) {
            clearInterval(closeCheck)
            reject(new Error('The login popup was closed.'))
          }
        }, 500)

        const handler = (event: MessageEvent<OAuthPopupMessage>) => {
          if (
            event.origin !== oauthOrigin ||
            event.source !== popup ||
            event.data?.state !== state
          ) {
            return
          }
          if (event.data.userHandle != null) {
            window.removeEventListener('message', handler)
            clearInterval(closeCheck)
            resolve({ userHandle: event.data.userHandle })
          }
        }
        window.addEventListener('message', handler, false)
      })

      // 5. Sign wallet signature using ethers
      if (!walletProvider) {
        throw new Error('Wallet provider not available')
      }
      const provider = new BrowserProvider(walletProvider)
      const signer = await provider.getSigner()
      const timestamp = Math.round(new Date().getTime() / 1000)
      const message = `Connecting Audius user @${userHandle} at ${timestamp}`
      const signature = await signer.signMessage(message)

      // 6. Send wallet signature back to popup
      popup.postMessage(
        {
          state,
          walletSignature: { message, signature }
        },
        oauthOrigin
      )

      // 7. Wait for auth code from popup (after EntityManager tx completes)
      const { code } = await new Promise<{ code: string }>(
        (resolve, reject) => {
          const closeCheck = setInterval(() => {
            if (popup.closed) {
              clearInterval(closeCheck)
              reject(new Error('The login popup was closed.'))
            }
          }, 500)

          const handler = (event: MessageEvent<OAuthPopupMessage>) => {
            if (
              event.origin !== oauthOrigin ||
              event.source !== popup ||
              event.data?.state !== state
            ) {
              return
            }
            if (event.data.code != null) {
              window.removeEventListener('message', handler)
              clearInterval(closeCheck)
              resolve({ code: event.data.code })
            }
          }
          window.addEventListener('message', handler, false)
        }
      )

      // 8. Exchange code for tokens
      const tokenRes = await fetch(`${apiEndpoint}/v1/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          code_verifier: codeVerifier,
          client_id: API_KEY,
          redirect_uri: 'postMessage'
        })
      })

      if (!tokenRes.ok) {
        throw new Error('Token exchange failed')
      }

      const tokens = await tokenRes.json()

      // 9. Fetch user profile and update cache
      const meRes = await fetch(`${apiEndpoint}/v1/me`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      })
      if (meRes.ok) {
        const { data: audiusUser } = await meRes.json()
        if (audiusUser) {
          await queryClient.cancelQueries({
            queryKey: getDashboardWalletUserQueryKey(wallet)
          })
          dispatch(disableAudiusProfileRefetch())
          queryClient.setQueryData(getDashboardWalletUserQueryKey(wallet), {
            wallet,
            user: audiusUser
          })
        }
      }

      setIsWaiting(false)
      onSuccess()
    } catch (e) {
      console.error('Connect Audius profile failed:', e)
      setIsWaiting(false)
    }
  }, [wallet, walletProvider, queryClient, dispatch, onSuccess])

  const disconnect = useCallback(async () => {
    setIsWaiting(true)

    try {
      // Generate PKCE params
      const state = generateState()
      const codeVerifier = generateCodeVerifier()
      const codeChallenge = await generateCodeChallenge(codeVerifier)
      const origin = window.location.origin

      // Construct OAuth URL for disconnect
      const params = new URLSearchParams({
        scope: 'write',
        api_key: API_KEY,
        state,
        redirect_uri: 'postMessage',
        origin,
        response_type: 'code',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        display: 'popup',
        tx: 'disconnect_dashboard_wallet',
        wallet
      })
      const oauthUrl = `${OAUTH_BASE_URL}?${params.toString()}`

      // Open popup
      const popup = window.open(
        oauthUrl,
        '',
        'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=375, height=785, top=100, left=100'
      )
      if (!popup) {
        throw new Error('The login popup was blocked.')
      }

      const oauthOrigin = new URL(OAUTH_BASE_URL).origin

      // Wait for auth code (disconnect doesn't need wallet signature exchange)
      await new Promise<void>((resolve, reject) => {
        const closeCheck = setInterval(() => {
          if (popup.closed) {
            clearInterval(closeCheck)
            reject(new Error('The login popup was closed.'))
          }
        }, 500)

        const handler = (event: MessageEvent<OAuthPopupMessage>) => {
          if (
            event.origin !== oauthOrigin ||
            event.source !== popup ||
            event.data?.state !== state
          ) {
            return
          }
          if (event.data.code != null) {
            window.removeEventListener('message', handler)
            clearInterval(closeCheck)
            resolve()
          }
        }
        window.addEventListener('message', handler, false)
      })

      // Optimistically clear the connected user
      await queryClient.cancelQueries({
        queryKey: getDashboardWalletUserQueryKey(wallet)
      })
      dispatch(disableAudiusProfileRefetch())
      queryClient.setQueryData(getDashboardWalletUserQueryKey(wallet), null)
      setIsWaiting(false)
      onSuccess()
    } catch (e) {
      console.error('Disconnect Audius profile failed:', e)
      setIsWaiting(false)
    }
  }, [wallet, queryClient, dispatch, onSuccess])

  return { connect, disconnect, isWaiting }
}
