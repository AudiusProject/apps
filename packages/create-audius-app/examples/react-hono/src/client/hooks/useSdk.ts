import { sdk } from '@audius/sdk'
import { Hedgehog } from '@audius/hedgehog'
import { createHedgehogWalletClient } from '@audius/sdk'

const apiKey = import.meta.env.VITE_AUDIUS_API_KEY as string

// Initialize Hedgehog for write operations
// For OAuth apps, hedgehog reads the wallet from localStorage set by OAuth flow
// We use no-op functions since OAuth handles authentication
const getFn = async () => ({ iv: '', cipherText: '' })
const setAuthFn = async () => ({ iv: '', cipherText: '' })
const setUserFn = async () => ({})

const hedgehog = new Hedgehog(
  getFn,
  setAuthFn,
  setUserFn,
  true, // useLocalStorage
  window.localStorage
)

// Create SDK instance with hedgehog wallet for write operations
const audiusWalletClient = createHedgehogWalletClient(hedgehog)

const instance = sdk({
  apiKey,
  services: {
    audiusWalletClient
  }
})

export const useSdk = () => ({ sdk: instance })
