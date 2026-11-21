import abiDecoder from 'abi-decoder'
import sigUtil from 'eth-sig-util'
import type { Log } from 'web3-core'
import type { AbiItem, AbiInput } from 'web3-utils'

import DiscoverProviderFactoryABI from '../../data-contracts/ABIs/DiscoveryProviderFactory.json'
import EntityManagerABI from '../../data-contracts/ABIs/EntityManager.json'
import RegistryABI from '../../data-contracts/ABIs/Registry.json'
import { generators } from '../../data-contracts/signatureSchemas'

const abiMap: Record<string, AbiItem[]> = {}

;[RegistryABI, DiscoverProviderFactoryABI, EntityManagerABI].forEach(
  ({ contractName, abi }) => {
    abiDecoder.addABI(abi as AbiItem[])
    abiMap[contractName] = abi as AbiItem[]
  }
)

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- should just use esm
export class AudiusABIDecoder {
  static decodeMethod(contractName: string, encodedABI: string) {
    const decoded = abiDecoder.decodeMethod(encodedABI)
    if (!decoded) {
      throw new Error('No Audius ABI matches given data')
    }

    const abi = abiMap[contractName]
    if (!abi) {
      throw new Error(`Unrecognized contract name ${contractName}`)
    }

    let foundFunction: AbiItem | undefined
    abi.forEach((item) => {
      if (item.type === 'function' && item.name === decoded.name) {
        foundFunction = item
      }
    })

    if (!foundFunction) {
      throw new Error(
        `Unrecognized function ${decoded.name} for contract ${contractName}`
      )
    }

    const paramSpecs = foundFunction.inputs as AbiInput[]
    decoded.params.forEach((param, idx) => {
      if (idx >= paramSpecs.length) {
        throw new Error('Extra parameter')
      }

      const paramSpec = paramSpecs[idx]
      if (paramSpec?.name !== param.name || paramSpec.type !== param.type) {
        throw new Error(
          `Invalid name or value for param ${paramSpec?.name}: ${paramSpec?.type}`
        )
      }
    })

    return decoded
  }

  static decodeLogs(_: string, logs: Log[]) {
    return abiDecoder.decodeLogs(logs)
  }

  static decodeAbi(
    contractName: string,
    encodedABI: string
  ): Map<string, string> {
    const decodedABI = AudiusABIDecoder.decodeMethod(contractName, encodedABI)
    const mapping = new Map()

    decodedABI.params.forEach((param) => {
      mapping.set(param.name.substring(1), param.value)
    })

    return mapping
  }

  static recoverSigner({
    encodedAbi,
    chainId,
    entityManagerAddress
  }: {
    encodedAbi: string
    chainId: string
    entityManagerAddress: string
  }): string {
    const decodedAbi = this.decodeAbi('EntityManager', encodedAbi)
    const data = generators.getManageEntityData(
      chainId,
      entityManagerAddress,
      decodedAbi.get('userId'),
      decodedAbi.get('entityType'),
      decodedAbi.get('entityId'),
      decodedAbi.get('action'),
      decodedAbi.get('metadata'),
      decodedAbi.get('nonce')
    )
    const sig = decodedAbi.get('subjectSig')
    if (sig === undefined)
      throw new Error('subjectSig is not present in decoded abi')
    return sigUtil.recoverTypedSignature({ data, sig })
  }
}
