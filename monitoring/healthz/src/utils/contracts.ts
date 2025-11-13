import {
  BytesLike,
  Contract,
  JsonRpcProvider,
  WebSocketProvider,
  ZeroAddress,
  ethers,
} from 'ethers'
import {
  RegistryAbi,
  ServiceProviderFactoryAbi,
  ServiceTypeManagerAbi,
} from './abis'
import { SP } from '../useServiceProviders'

/** random utilities */
const utf8ToHex = (s: string): BytesLike => {
  return ethers.encodeBytes32String(s)
}

const hexToUtf8 = (s: BytesLike): string => {
  return ethers.decodeBytes32String(s)
}

const isAcceptedServiceType = (b: BytesLike): boolean => {
  const s = hexToUtf8(b)
  const acceptedTypes = ['content-node', 'discovery-node']
  return acceptedTypes.includes(s)
}

const isStaging = (env: string): boolean => {
  return env === 'staging'
}

/** contract keys */
const RegistryKey = utf8ToHex('Registry')
const ServiceProviderFactoryKey = utf8ToHex('ServiceProviderFactory')

const ProdProvider = new WebSocketProvider(
  'wss://eth-mainnet.alchemyapi.io/v2/hELYSivAlDc8LV29Mw_LumSdCZ4HQEge'
)
const StageProvider = new WebSocketProvider(
  'wss://eth-sepolia.g.alchemy.com/v2/J1Pj86H-g87FqUZVMUbLGgnyoaQTHP1P'
)

// `${env}` => SPs
const spCache: Map<string, SP[]> = new Map()

export const getRegisteredNodes = async (
  env: string
): Promise<SP[]> => {
  const cacheKey = `${env}`
  const cached = spCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const provider = isStaging(env) ? StageProvider : ProdProvider

  const initialRegistryAddress = isStaging(env)
    ? '0xc682C2166E11690B64338e11633Cb8Bb60B0D9c0'
    : '0xd976d3b4f4e22a238c1A736b6612D22f17b6f64C'

  const registry = new Contract(initialRegistryAddress, RegistryAbi, provider)

  const registryAddress: string = await registry.getContract(RegistryKey)
  if (registryAddress !== initialRegistryAddress) {
    throw new Error(
      `Retrieved registry address ${registryAddress} does not match given address ${provider}`
    )
  }

  const serviceProviderFactoryAddress = await registry.getContract(
    ServiceProviderFactoryKey
  )

  const serviceProviderFactory = new Contract(
    serviceProviderFactoryAddress,
    ServiceProviderFactoryAbi,
    provider
  )
  const serviceTypeManagerAddress =
    await serviceProviderFactory.getServiceTypeManagerAddress()

  const serviceTypeManager = new Contract(
    serviceTypeManagerAddress,
    ServiceTypeManagerAbi,
    provider
  )
  const serviceTypes = await serviceTypeManager.getValidServiceTypes()

  const sps: SP[] = []

  for (const serviceType of serviceTypes) {
    if (!isAcceptedServiceType(serviceType)) continue
    const serviceProviderIds =
      await serviceProviderFactory.getTotalServiceTypeProviders(serviceType)
    for (let spid = BigInt(0); spid <= serviceProviderIds; spid++) {
      const {
        0: owner,
        1: endpoint,
        2: blockNumber,
        3: delegateOwnerWallet,
      } = await serviceProviderFactory.getServiceEndpointInfo(serviceType, spid)
      if (owner === ZeroAddress) continue
      const type = hexToUtf8(serviceType)
      sps.push({
        delegateOwnerWallet,
        endpoint,
        isRegistered: true,
        spID: spid,
        // @ts-ignore
        type,
        blockNumber,
      })
    }
  }

  spCache.set(cacheKey, sps)

  return sps
}
