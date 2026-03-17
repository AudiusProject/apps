import { useEffect, useState } from 'react'

import { Id } from '@audius/sdk'

import { audiusSdk } from 'app/services/sdk/audius-sdk'

import { messages } from '../messages'

type UseAppInfoResult = {
  appName: string | undefined
  appImage: string | undefined
  userAlreadyWriteAuthorized: boolean
  loading: boolean
  error: string | null
}

/**
 * Fetches developer app metadata and checks whether the current user has
 * already granted write access to the app.
 */
export const useAppInfo = ({
  apiKey,
  queryParamAppName,
  scope,
  userId,
  skip
}: {
  apiKey: string | null
  queryParamAppName: string | null
  scope: string | null
  userId: number | undefined
  /** Skip all fetching (e.g. when there's already a param validation error). */
  skip: boolean
}): UseAppInfoResult => {
  const [registeredAppName, setRegisteredAppName] = useState<
    string | undefined
  >()
  const [appImage, setAppImage] = useState<string | undefined>()
  const [userAlreadyWriteAuthorized, setUserAlreadyWriteAuthorized] =
    useState(false)
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (skip) {
      setLoading(false)
      return
    }
    const setup = async () => {
      try {
        const sdk = await audiusSdk()

        if (apiKey) {
          try {
            const res = await sdk.developerApps.getDeveloperApp({
              address: apiKey
            })
            if (!res.data) {
              setError(messages.invalidApiKeyError)
              return
            }
            setRegisteredAppName(res.data.name)
            if (res.data.imageUrl) setAppImage(res.data.imageUrl)
          } catch {
            setError(messages.invalidApiKeyError)
            return
          }
        }

        if (scope === 'write' && apiKey && userId != null) {
          try {
            const id = Id.parse(userId)
            const authorizedApps = await sdk.users.getAuthorizedApps({ id })
            const prefixed = apiKey.startsWith('0x')
              ? apiKey.toLowerCase()
              : `0x${apiKey}`.toLowerCase()
            const found = authorizedApps.data?.some(
              (a) => a.address.toLowerCase() === prefixed
            )
            setUserAlreadyWriteAuthorized(Boolean(found))
          } catch {
            // Non-fatal: assume not yet authorized
          }
        }
      } finally {
        setLoading(false)
      }
    }
    setup()
  }, [apiKey, scope, userId, skip])

  return {
    appName: registeredAppName ?? queryParamAppName ?? undefined,
    appImage,
    userAlreadyWriteAuthorized,
    loading,
    error
  }
}
