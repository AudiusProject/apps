import { promises } from 'fs'
import path from 'path'

import {
  EthRewardsManager,
  ServiceProviderFactory,
  ServiceTypeManager
} from '@audius/eth'
import { range } from 'lodash'
import { createPublicClient, hexToString, http } from 'viem'
import { mainnet } from 'viem/chains'

import type { SdkServicesConfig } from '../config/types'

const { writeFile } = promises

const productionConfig: SdkServicesConfig = {
  network: {
    minVersion: '',
    apiEndpoint: 'https://api.audius.co',
    storageNodes: [],
    antiAbuseOracleNodes: {
      endpoints: [
        'https://discoveryprovider.audius.co',
        'https://audius-oracle.creatorseed.com',
        'https://oracle.audius.endl.net'
      ],
      registeredAddresses: []
    },
    identityService: 'https://identityservice.audius.co'
  },
  acdc: {
    entityManagerContractAddress: '0x1Cd8a543596D499B9b6E7a6eC15ECd2B7857Fd64',
    chainId: 31524
  },
  solana: {
    claimableTokensProgramAddress:
      'Ewkv3JahEFRKkcJmpoKB7pXbnUHwjAyXiwEo4ZY2rezQ',
    rewardManagerProgramAddress: 'DDZDcYdQFEMwcu2Mwo75yGFjJ1mUQyyXLWzhZLEVFcei',
    rewardManagerStateAddress: '71hWFVYokLaN1PNYzTAWi13EfJ7Xt9VbSWUKsXUT8mxE',
    paymentRouterProgramAddress: 'paytYpX3LPN98TAeen6bFFeraGSuWnomZmCXjAsoqPa',
    stakingBridgeProgramAddress: 'stkB5DZziVJT1C1VmzvDdRtdWxfs5nwcHViiaNBDK31',
    rpcEndpoint: 'https://carolina-8qh733-fast-mainnet.helius-rpc.com',
    usdcTokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    wAudioTokenMint: '9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM',
    rewardManagerLookupTableAddress:
      '4UQwpGupH66RgQrWRqmPM9Two6VJEE68VZ7GeqZ3mvVv'
  },
  ethereum: {
    rpcEndpoint: 'https://eth-client.audius.co',
    addresses: {
      ethRewardsManagerAddress: '0x5aa6B99A2B461bA8E97207740f0A689C5C39C3b0',
      serviceProviderFactoryAddress:
        '0xD17A9bc90c582249e211a4f4b16721e7f65156c8',
      serviceTypeManagerAddress: '0x9EfB0f4F38aFbb4b0984D00C126E97E21b8417C5',
      audiusTokenAddress: '0x18aAA7115705e8be94bfFEBDE57Af9BFc265B998',
      audiusWormholeAddress: '0x6E7a1F7339bbB62b23D44797b63e4258d283E095',
      delegateManagerAddress: '0x4d7968ebfD390D5E7926Cb3587C39eFf2F9FB225',
      stakingAddress: '0xe6D97B2099F142513be7A2a068bE040656Ae4591',
      governanceAddress: '0x4DEcA517D6817B6510798b7328F2314d3003AbAC',
      claimsManagerAddress: '0x44617F9dCEd9787C3B06a05B35B4C779a2AA1334',
      trustedNotifierManagerAddress:
        '0x6f08105c8CEef2BC5653640fcdbBE1e7bb519D39',
      registryAddress: '0xd976d3b4f4e22a238c1A736b6612D22f17b6f64C'
    }
  }
}

const developmentConfig: SdkServicesConfig = {
  network: {
    minVersion: '0.0.0',
    apiEndpoint: 'http://audius-api',
    storageNodes: [
      {
        delegateOwnerWallet: '0x0D38e653eC28bdea5A2296fD5940aaB2D0B8875c',
        endpoint: 'http://audius-creator-node-1'
      }
    ],
    antiAbuseOracleNodes: {
      endpoints: ['http://audius-anti-abuse-oracle-1:8000'],
      registeredAddresses: ['0xF0D5BC18421fa04D0a2A2ef540ba5A9f04014BE3']
    },
    identityService: 'http://audius-identity-service-1'
  },
  acdc: {
    entityManagerContractAddress: '0x254dffcd3277C0b1660F6d42EFbB754edaBAbC2B',
    chainId: 1337
  },
  solana: {
    claimableTokensProgramAddress:
      'testHKV1B56fbvop4w6f2cTGEub9dRQ2Euta5VmqdX9',
    rewardManagerProgramAddress: 'testLsJKtyABc9UXJF8JWFKf1YH4LmqCWBC42c6akPb',
    rewardManagerStateAddress: 'DJPzVothq58SmkpRb1ATn5ddN2Rpv1j2TcGvM3XsHf1c',
    paymentRouterProgramAddress: 'apaySbqV1XAmuiGszeN4NyWrXkkMrnuJVoNhzmS1AMa',
    stakingBridgeProgramAddress: '',
    rpcEndpoint: 'http://audius-solana-test-validator-1',
    usdcTokenMint: '26Q7gP8UfkDzi7GMFEQxTJaNJ8D2ybCUjex58M5MLu8y',
    wAudioTokenMint: '37RCjhgV1qGV2Q54EHFScdxZ22ydRMdKMtVgod47fDP3',
    rewardManagerLookupTableAddress:
      'GNHKVSmHvoRBt1JJCxz7RSMfzDQGDGhGEjmhHyxb3K5J'
  },
  ethereum: {
    rpcEndpoint: 'http://audius-eth-ganache-1',
    addresses: {
      ethRewardsManagerAddress: '0x',
      serviceProviderFactoryAddress: '0x',
      serviceTypeManagerAddress: '0x',
      audiusTokenAddress: '0xdcB2fC9469808630DD0744b0adf97C0003fC29B2',
      audiusWormholeAddress: '0x',
      delegateManagerAddress: '0x',
      stakingAddress: '0x',
      governanceAddress: '0x',
      claimsManagerAddress: '0x',
      trustedNotifierManagerAddress: '0x',
      registryAddress: '0x'
    }
  }
}

const DISCOVERY_NODE_SERVICE_TYPE =
  '0x646973636f766572792d6e6f6465000000000000000000000000000000000000' as const
const CONTENT_NODE_SERVICE_TYPE =
  '0x636f6e74656e742d6e6f64650000000000000000000000000000000000000000' as const
const VALIDATOR_SERVICE_TYPE =
  '0x76616c696461746f720000000000000000000000000000000000000000000000' as const

const generateServicesConfig = async (
  config: SdkServicesConfig
): Promise<SdkServicesConfig> => {
  const ethPublicClient = createPublicClient({
    chain: mainnet,
    transport: http(config.ethereum.rpcEndpoint)
  })

  const spfAddress = config.ethereum.addresses.serviceProviderFactoryAddress
  const stmAddress = config.ethereum.addresses.serviceTypeManagerAddress
  const ermAddress = config.ethereum.addresses.ethRewardsManagerAddress

  // Fetch service providers by type
  const getServiceEndpoints = async (serviceType: `0x${string}`) => {
    const count = await ethPublicClient.readContract({
      address: spfAddress,
      abi: ServiceProviderFactory.abi,
      functionName: 'getTotalServiceTypeProviders',
      args: [serviceType]
    })
    const list = await Promise.all(
      range(1, Number(count) + 1).map((i) =>
        ethPublicClient.readContract({
          address: spfAddress,
          abi: ServiceProviderFactory.abi,
          functionName: 'getServiceEndpointInfo',
          args: [serviceType, BigInt(i)]
        })
      )
    )
    return list.filter(([_, endpoint]) => endpoint !== '')
  }

  const validators = await getServiceEndpoints(VALIDATOR_SERVICE_TYPE)
  const contentNodes = await getServiceEndpoints(CONTENT_NODE_SERVICE_TYPE)
  const storageNodes = validators.concat(contentNodes)
  if (!storageNodes || storageNodes.length === 0) {
    throw Error('Storage node services not found')
  }
  const antiAbuseAddresses = await ethPublicClient.readContract({
    address: ermAddress,
    abi: EthRewardsManager.abi,
    functionName: 'getAntiAbuseOracleAddresses'
  })

  if (!antiAbuseAddresses || antiAbuseAddresses.length === 0) {
    throw Error('Anti Abuse node services not found')
  }

  const versionHex = await ethPublicClient.readContract({
    address: stmAddress,
    abi: ServiceTypeManager.abi,
    functionName: 'getCurrentVersion',
    args: [DISCOVERY_NODE_SERVICE_TYPE]
  })
  const minVersion = hexToString(versionHex, { size: 32 })

  config.network.minVersion = minVersion
  // Filter to only *.audius.co storage nodes to improve upload success rates —
  // third-party nodes have historically had lower reliability.
  config.network.storageNodes = storageNodes
    .filter(([_ownerWallet, endpoint]: any) => {
      try {
        const { hostname } = new URL(endpoint)
        return hostname.endsWith('.audius.co')
      } catch {
        return false
      }
    })
    .map(([_ownerWallet, endpoint, _blockNumber, delegateOwnerWallet]: any) => ({
      endpoint,
      delegateOwnerWallet
    }))
  config.network.antiAbuseOracleNodes.registeredAddresses = [
    ...antiAbuseAddresses
  ]

  return config
}

const writeServicesConfig = async () => {
  const production = await generateServicesConfig(productionConfig)
  const development = developmentConfig
  const config: Record<string, SdkServicesConfig> = {
    development,
    production
  }
  for (const env of Object.keys(config)) {
    await writeFile(
      path.resolve(__dirname, `../config/${env}.ts`),
      `/*
 * This file is autogenerated by ./scripts/generateServicesConfig.ts.
 * DO NOT EDIT MANUALLY!
 */
/* eslint-disable prettier/prettier */
import type { SdkServicesConfig } from './types'
export const ${env}Config: SdkServicesConfig = ${JSON.stringify(
        config[env],
        undefined,
        2
      )}
`
    )
  }
}

writeServicesConfig()
