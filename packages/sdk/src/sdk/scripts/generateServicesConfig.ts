import { promises } from 'fs'
import path from 'path'

import type { SdkServicesConfig } from '../config/types'
import {
  EthRewardsManagerClient,
  getDefaultEthRewardsManagerConfig,
  getDefaultServiceProviderFactoryConfig,
  getDefaultServiceTypeManagerConfig,
  ServiceProviderFactoryClient,
  ServiceTypeManagerClient
} from '../services/Ethereum'

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
    rpcEndpoint: 'https://audius-fe.rpcpool.com',
    usdcTokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    wAudioTokenMint: '9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM',
    bonkTokenMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
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
      stakingAddress: '0xe6D97B2099F142513be7A2a068bE040656Ae4591'
    }
  }
}

const stagingConfig: SdkServicesConfig = {
  network: {
    minVersion: '',
    apiEndpoint: 'https://api.staging.audius.co',
    storageNodes: [],
    antiAbuseOracleNodes: {
      endpoints: ['https://discoveryprovider.staging.audius.co'],
      registeredAddresses: []
    },
    identityService: 'https://identityservice.staging.audius.co'
  },
  acdc: {
    entityManagerContractAddress: '0x1Cd8a543596D499B9b6E7a6eC15ECd2B7857Fd64',
    chainId: 1056801
  },
  solana: {
    claimableTokensProgramAddress:
      '2sjQNmUfkV6yKKi4dPR8gWRgtyma5aiymE3aXL2RAZww',
    rewardManagerProgramAddress: 'CDpzvz7DfgbF95jSSCHLX3ERkugyfgn9Fw8ypNZ1hfXp',
    rewardManagerStateAddress: 'GaiG9LDYHfZGqeNaoGRzFEnLiwUT7WiC6sA6FDJX9ZPq',
    paymentRouterProgramAddress: 'sp28KA2bTnTA4oSZ3r9tTSKfmiXZtZQHnYYQqWfUyVa',
    stakingBridgeProgramAddress: 'stkuyR7dTzxV1YnoDo5tfuBmkuKn7zDatimYRDTmQvj',
    rpcEndpoint: 'https://audius-fe.rpcpool.com',
    usdcTokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    wAudioTokenMint: '9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM',
    bonkTokenMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    rewardManagerLookupTableAddress:
      'ChFCWjeFxM6SRySTfT46zXn2K7m89TJsft4HWzEtkB4J'
  },
  ethereum: {
    rpcEndpoint: 'https://eth-client.staging.audius.co',
    addresses: {
      ethRewardsManagerAddress: '0x563483ccD66a49Ca730275F8cf37Dd3E6Da864f1',
      serviceProviderFactoryAddress:
        '0x377BE01aD31360d0DFB16035A4515954395A8185',
      serviceTypeManagerAddress: '0x9fd76d2cD48022526F3a164541E6552291F4a862',
      audiusTokenAddress: '0x1376180Ee935AA64A27780F4BE97726Df7B0e2B2',
      audiusWormholeAddress: '0xf6f45e4d836da1d4ecd43bb1074620bfb0b7e0d7',
      delegateManagerAddress: '0xDA74d6FfbF268Ac441404f5a61f01103451E8697',
      stakingAddress: '0x5bcF21A4D5Bab9B0869B9c55D233f80135C814C6'
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
    bonkTokenMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
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
      stakingAddress: '0x'
    }
  }
}

const generateServicesConfig = async (
  config: SdkServicesConfig
): Promise<SdkServicesConfig> => {
  const serviceProviderFactory = new ServiceProviderFactoryClient(
    getDefaultServiceProviderFactoryConfig(config)
  )
  const ethRewardsManager = new EthRewardsManagerClient(
    getDefaultEthRewardsManagerConfig(config)
  )
  const serviceTypeManager = new ServiceTypeManagerClient(
    getDefaultServiceTypeManagerConfig(config)
  )

  const validators = await serviceProviderFactory.getValidators()
  const contentNodes = await serviceProviderFactory.getContentNodes()
  const storageNodes = validators.concat(contentNodes)
  if (!storageNodes || storageNodes.length === 0) {
    throw Error('Storage node services not found')
  }
  const antiAbuseAddresses =
    await ethRewardsManager.contract.getAntiAbuseOracleAddresses()

  if (!antiAbuseAddresses || antiAbuseAddresses.length === 0) {
    throw Error('Anti Abuse node services not found')
  }

  const minVersion = await serviceTypeManager.getDiscoveryNodeVersion()

  config.network.minVersion = minVersion
  config.network.storageNodes = storageNodes.map(
    ([_ownerWallet, endpoint, _blockNumber, delegateOwnerWallet]: any) => ({
      endpoint,
      delegateOwnerWallet
    })
  )
  config.network.antiAbuseOracleNodes.registeredAddresses = [
    ...antiAbuseAddresses
  ]

  return config
}

const writeServicesConfig = async () => {
  const production = await generateServicesConfig(productionConfig)
  const staging = await generateServicesConfig(stagingConfig)
  const development = developmentConfig
  const config: Record<string, SdkServicesConfig> = {
    development,
    staging,
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
