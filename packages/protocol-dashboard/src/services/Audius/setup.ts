import { libs as AudiusLibs } from '@audius/sdk-legacy/dist/web-libs'
import { Eip1193Provider } from 'ethers'

import { CHAIN_ID, ETH_PROVIDER_URL } from 'utils/eth'

import { AudiusClient } from './AudiusClient'
import { apiEndpoint } from './sdk'

declare global {
  interface Window {
    AudiusClient: any
    Audius: any
    Web3: any
    web3: any
    dataWeb3: any
    isAccountMisconfigured: boolean
  }
}

const Web3 = window.Web3

const identityServiceEndpoint = import.meta.env.VITE_IDENTITY_SERVICE_ENDPOINT
const registryAddress = import.meta.env.VITE_REGISTRY_ADDRESS
const ethRegistryAddress = import.meta.env.VITE_ETH_REGISTRY_ADDRESS
const ethTokenAddress = import.meta.env.VITE_ETH_TOKEN_ADDRESS
const claimDistributionContractAddress = import.meta.env
  .VITE_CLAIM_DISTRIBUTION_CONTRACT_ADDRESS
const wormholeContractAddress = import.meta.env.VITE_WORMHOLE_CONTRACT_ADDRESS
const entityManagerAddress = import.meta.env.VITE_ENTITY_MANAGER_ADDRESS

const ethOwnerWallet = import.meta.env.VITE_ETH_OWNER_WALLET

const SOLANA_CLUSTER_ENDPOINT = import.meta.env.VITE_SOLANA_CLUSTER_ENDPOINT
const WAUDIO_MINT_ADDRESS = import.meta.env.VITE_WAUDIO_MINT_ADDRESS
const USDC_MINT_ADDRESS = import.meta.env.VITE_USDC_MINT_ADDRESS
const SOLANA_TOKEN_ADDRESS = import.meta.env.VITE_SOLANA_TOKEN_PROGRAM_ADDRESS
const CLAIMABLE_TOKEN_PDA = import.meta.env.VITE_CLAIMABLE_TOKEN_PDA
const SOLANA_FEE_PAYER_ADDRESS = import.meta.env.VITE_SOLANA_FEE_PAYER_ADDRESS

const CLAIMABLE_TOKEN_PROGRAM_ADDRESS = import.meta.env
  .VITE_CLAIMABLE_TOKEN_PROGRAM_ADDRESS
const REWARDS_MANAGER_PROGRAM_ID = import.meta.env
  .VITE_REWARDS_MANAGER_PROGRAM_ID
const REWARDS_MANAGER_PROGRAM_PDA = import.meta.env
  .VITE_REWARDS_MANAGER_PROGRAM_PDA
const REWARDS_MANAGER_TOKEN_PDA = import.meta.env.VITE_REWARDS_MANAGER_TOKEN_PDA
const ENV = import.meta.env.VITE_ENVIRONMENT

export const IS_PRODUCTION = ENV === 'production'
const IS_STAGING = ENV === 'staging'

export const getWalletChainId = async (walletProvider: Eip1193Provider) => {
  const chainId = await walletProvider.request({ method: 'eth_chainId' })
  return parseInt(chainId, 16).toString()
}

/**
 * Ethereum providers sometime returns null chainId,
 * so if this happens, try a second time after a slight delay
 */
const getWalletIsOnEthMainnet = async (walletProvider: Eip1193Provider) => {
  let chainId = await getWalletChainId(walletProvider)
  if (chainId === CHAIN_ID) return true

  // Try a second time just in case wallet was being slow to understand itself
  chainId = await new Promise((resolve) => {
    console.debug('Wallet network not matching, trying again')
    setTimeout(async () => {
      chainId = await getWalletChainId(walletProvider)
      resolve(chainId)
    }, 2000)
  })

  return chainId === CHAIN_ID
}

export let resolveAccountConnected: null | ((provider: Eip1193Provider) => void)
const accountConnectedPromise = new Promise<Eip1193Provider>((resolve) => {
  resolveAccountConnected = resolve
})

export async function setup(this: AudiusClient): Promise<void> {
  // Until the user connects, we're in read only mode

  // Avoid initializing read-only libs if account is already connected from previous session
  const quickConnectedWalletProvider = await Promise.race([
    accountConnectedPromise,
    new Promise((resolve) => {
      setTimeout(() => {
        resolve(null)
      }, 3500)
    })
  ])
  if (quickConnectedWalletProvider === null) {
    this.isViewOnly = true
    this.libs = await configureReadOnlyLibs()
    window.audiusLibs = this.libs
    this.isSetup = true
    this.onSetupFinished()
  }

  // Wait for user to connect with web3modal:
  const walletProvider = await accountConnectedPromise

  let account = null

  try {
    const isOnMainnetEth = await getWalletIsOnEthMainnet(walletProvider)
    if (!isOnMainnetEth) {
      this.isMisconfigured = true
      this.libs = await configureReadOnlyLibs()
      this.onWalletAccountLoaded(null)
    }

    this.libs = await configureLibsWithAccount({
      walletProvider,
      onWalletAccountLoaded: (loadedAccount) => {
        account = loadedAccount
      }
    })

    // Failed to pull necessary info from metamask, configure read only
    if (!this.libs) {
      this.libs = await configureReadOnlyLibs()
      this.isAccountMisconfigured = true
      this.hasValidAccount = false
    } else {
      this.hasValidAccount = true
      this.isViewOnly = false
    }
  } catch (err) {
    console.error(err)
    this.isMisconfigured = true
    this.onWalletAccountLoaded(null)
    this.libs = await configureReadOnlyLibs()
  }

  window.audiusLibs = this.libs
  this.isSetup = true
  this.onWalletAccountLoaded(account)
  this.onSetupFinished()
}

const configureReadOnlyLibs = async () => {
  // @ts-ignore
  const ethWeb3Config = AudiusLibs.configEthWeb3(
    ethTokenAddress!,
    ethRegistryAddress!,
    ETH_PROVIDER_URL,
    ethOwnerWallet!,
    claimDistributionContractAddress!,
    wormholeContractAddress!
  )
  // @ts-ignore
  const solanaWeb3Config = AudiusLibs.configSolanaWeb3({
    claimableTokenPDA: CLAIMABLE_TOKEN_PDA!,
    solanaClusterEndpoint: SOLANA_CLUSTER_ENDPOINT!,
    mintAddress: WAUDIO_MINT_ADDRESS!,
    usdcMintAddress: USDC_MINT_ADDRESS!,
    solanaTokenAddress: SOLANA_TOKEN_ADDRESS!,
    // @ts-ignore
    feePayerAddress: SOLANA_FEE_PAYER_ADDRESS!,
    claimableTokenProgramAddress: CLAIMABLE_TOKEN_PROGRAM_ADDRESS!,
    rewardsManagerProgramId: REWARDS_MANAGER_PROGRAM_ID!,
    rewardsManagerProgramPDA: REWARDS_MANAGER_PROGRAM_PDA!,
    rewardsManagerTokenPDA: REWARDS_MANAGER_TOKEN_PDA!,
    useRelay: true
  })

  const identityServiceConfig = {
    url: identityServiceEndpoint
  }

  const audiusLibsConfig = {
    ethWeb3Config,
    solanaWeb3Config,
    identityServiceConfig,
    discoveryProviderConfig: { endpoint: apiEndpoint },
    isServer: false,
    isDebug: !IS_PRODUCTION && !IS_STAGING
  }
  // @ts-ignore
  const libs = new AudiusLibs(audiusLibsConfig)
  await libs.init()
  return libs
}

const configWeb3 = async (web3Provider: any, networkId: string) => {
  const web3Instance = new Web3(web3Provider)
  if (!web3Instance) {
    throw new Error('External web3 incorrectly configured')
  }
  const wallets = await web3Instance.eth.getAccounts()
  return {
    registryAddress,
    entityManagerAddress,
    useExternalWeb3: true,
    externalWeb3Config: {
      web3: web3Instance,
      ownerWallet: wallets[0]
    }
  }
}

const configureLibsWithAccount = async ({
  walletProvider,
  onWalletAccountLoaded
}: {
  walletProvider: Eip1193Provider
  onWalletAccountLoaded?: (account: string) => void
}) => {
  const configuredWeb3 = await configWeb3(walletProvider, CHAIN_ID)

  const connectedAccounts: any = await new Promise((resolve) => {
    configuredWeb3.externalWeb3Config.web3.eth.getAccounts((...args: any) => {
      resolve(args[1])
    })
  })
  const connectedAccount = connectedAccounts[0]

  if (onWalletAccountLoaded) {
    onWalletAccountLoaded(connectedAccount)
  }

  // Not connected or no accounts, return
  if (!connectedAccount) {
    return null
  }

  // @ts-ignore
  const ethWeb3Config = AudiusLibs.configEthWeb3(
    ethTokenAddress!,
    ethRegistryAddress!,
    configuredWeb3.externalWeb3Config.web3,
    connectedAccount,
    claimDistributionContractAddress!,
    wormholeContractAddress!,
    { disableMultiProvider: true }
  )

  // @ts-ignore
  const solanaWeb3Config = AudiusLibs.configSolanaWeb3({
    claimableTokenPDA: CLAIMABLE_TOKEN_PDA!,
    solanaClusterEndpoint: SOLANA_CLUSTER_ENDPOINT!,
    mintAddress: WAUDIO_MINT_ADDRESS!,
    usdcMintAddress: USDC_MINT_ADDRESS!,
    solanaTokenAddress: SOLANA_TOKEN_ADDRESS!,
    // @ts-ignore
    feePayerAddress: SOLANA_FEE_PAYER_ADDRESS!,
    claimableTokenProgramAddress: CLAIMABLE_TOKEN_PROGRAM_ADDRESS!,
    rewardsManagerProgramId: REWARDS_MANAGER_PROGRAM_ID!,
    rewardsManagerProgramPDA: REWARDS_MANAGER_PROGRAM_PDA!,
    rewardsManagerTokenPDA: REWARDS_MANAGER_TOKEN_PDA!,
    useRelay: true
  })

  const audiusLibsConfig = {
    web3Config: configuredWeb3,
    ethWeb3Config,
    solanaWeb3Config,
    // @ts-ignore
    identityServiceConfig: AudiusLibs.configIdentityService(
      identityServiceEndpoint!
    ),
    discoveryProviderConfig: { endpoint: apiEndpoint },
    isServer: false,
    isDebug: !IS_PRODUCTION && !IS_STAGING
  }
  // @ts-ignore
  const libs = new AudiusLibs(audiusLibsConfig)
  await libs.init()
  return libs
}
