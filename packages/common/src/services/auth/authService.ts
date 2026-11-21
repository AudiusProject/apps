import type { LocalStorage } from '../local-storage'

import {
  ConfirmCredentialsArgs,
  HedgehogConfig,
  createHedgehog
} from './hedgehog'
import type { ChangeCredentialsArgs, EthWallet } from './hedgehogLib'

export type AuthServiceConfig = {
  identityServiceEndpoint: string
  localStorage: LocalStorage
  createKey?: HedgehogConfig['createKey']
}

export type SignInResponse = {
  walletAddress: string
}

export type GetWalletAddressesResult = {
  accountWalletAddress: string
  web3WalletAddress: string
}

export type AuthService = {
  hedgehogInstance: ReturnType<typeof createHedgehog>
  signIn: (
    email: string,
    password: string,
    otp?: string
  ) => Promise<SignInResponse>
  signOut: () => Promise<void>
  resetPassword: ({
    username,
    password,
    oldLookupKey
  }: {
    username: string
    password: string
    oldLookupKey?: string
  }) => Promise<void>
  getWallet: () => EthWallet | null
  generateRecoveryInfo: () => Promise<{ login: string; host: string }>
  confirmCredentials: (args: ConfirmCredentialsArgs) => Promise<boolean>
  changeCredentials: (args: ChangeCredentialsArgs) => Promise<void>
}

export const createAuthService = ({
  localStorage,
  identityServiceEndpoint,
  createKey
}: AuthServiceConfig): AuthService => {
  const hedgehogInstance = createHedgehog({
    localStorage,
    useLocalStorage: true,
    identityServiceEndpoint,
    createKey
  })

  const signIn = async (email: string, password: string, otp?: string) => {
    const wallet = await hedgehogInstance.login({
      email,
      username: email,
      password,
      otp
    })

    const walletAddress = wallet.getAddressString()
    return { walletAddress }
  }

  const signOut = async () => {
    return hedgehogInstance.logout()
  }

  const resetPassword = async ({
    username,
    password,
    oldLookupKey
  }: {
    username: string
    password: string
    oldLookupKey?: string
  }) => {
    return hedgehogInstance.resetPassword({
      username,
      password,
      oldLookupKey
    })
  }

  const generateRecoveryInfo = async () => {
    await hedgehogInstance.waitUntilReady()
    return hedgehogInstance.generateRecoveryInfo()
  }

  const confirmCredentials = async (args: ConfirmCredentialsArgs) => {
    return await hedgehogInstance.confirmCredentials(args)
  }

  const changeCredentials = async (args: ChangeCredentialsArgs) => {
    return await hedgehogInstance.changeCredentials(args)
  }

  const getWallet = () => {
    return hedgehogInstance.wallet
  }

  return {
    hedgehogInstance,
    signIn,
    signOut,
    generateRecoveryInfo,
    getWallet,
    confirmCredentials,
    changeCredentials,
    resetPassword
  }
}
