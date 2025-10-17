import BN from 'bn.js'

import { BigNumber, Permission, Proposal } from 'types'
import { fetchWithTimeout } from 'utils/fetch'
import { formatAudString, formatNumber } from 'utils/format'

import AudiusClient from './AudiusClient'

// Helpers
export async function hasPermissions(
  this: AudiusClient,
  ...permissions: Array<Permission>
) {
  await this.awaitSetup()
  if (permissions.includes(Permission.WRITE) && !this.hasValidAccount) {
    throw new Error('Libs not configured')
  }
}

export function onSetup(this: AudiusClient) {
  this.isSetupPromise = new Promise((resolve) => {
    this._setupPromiseResolve = resolve
  })
  this.walletAccountLoadedPromise = new Promise((resolve) => {
    this._metaMaskAccountLoadedResolve = resolve
  })
}

export function onWalletAccountLoaded(
  this: AudiusClient,
  account: string | null
) {
  this.isMetaMaskAccountLoaded = true
  if (this._metaMaskAccountLoadedResolve) {
    this._metaMaskAccountLoadedResolve(account)
  }
}

export function onSetupFinished(this: AudiusClient) {
  if (this._setupPromiseResolve) {
    this._setupPromiseResolve()
  }
}

export async function awaitSetup(this: AudiusClient): Promise<void> {
  return this.isSetupPromise
}

export async function getEthBlockNumber(this: AudiusClient) {
  await this.hasPermissions()
  return this.libs.ethWeb3Manager.web3.eth.getBlockNumber()
}

export async function getEthWallet(this: AudiusClient) {
  await this.hasPermissions()
  return this.libs.ethWeb3Manager.ownerWallet
}

export async function isEoa(this: AudiusClient, wallet: string) {
  const web3 = this.libs.ethWeb3Manager.web3
  const code = await web3.eth.getCode(wallet)
  return code === '0x'
}

export async function getAverageBlockTime(this: AudiusClient) {
  await this.hasPermissions()
  const web3 = this.libs.ethWeb3Manager.web3
  const span = 1000
  const currentNumber = await web3.eth.getBlockNumber()
  const currentBlock = await web3.eth.getBlock(currentNumber)
  let firstBlock
  try {
    firstBlock = await web3.eth.getBlock(currentNumber - span)
  } catch (e) {
    firstBlock = await web3.eth.getBlock(1)
  }
  return Math.round(
    (currentBlock.timestamp - firstBlock.timestamp) / (span * 1.0)
  )
}

export async function getBlock(this: AudiusClient, blockNumber: number) {
  await this.hasPermissions()
  const web3 = this.libs.ethWeb3Manager.web3
  const block = await web3.eth.getBlock(blockNumber)
  return block
}

export async function getBlockNearTimestamp(
  this: AudiusClient,
  averageBlockTime: number,
  currentBlockNumber: number,
  timestamp: number
) {
  await this.hasPermissions()
  const web3 = this.libs.ethWeb3Manager.web3
  const now = new Date()
  const then = new Date(timestamp)
  // @ts-ignore: date subtraction works
  const seconds = (now - then) / 1000
  const blocks = Math.round(seconds / averageBlockTime)
  const targetNumber = Math.max(currentBlockNumber - blocks, 0)
  const targetBlock = await web3.eth.getBlock(targetNumber)
  return targetBlock
}

export async function toChecksumAddress(this: AudiusClient, wallet: string) {
  await this.awaitSetup()
  const web3 = this.libs.ethWeb3Manager.web3
  return web3.utils.toChecksumAddress(wallet)
}

// Static Helpers
export function getBNPercentage(
  n1: BigNumber,
  n2: BigNumber,
  decimals: number = 2
): number {
  const divisor = Math.pow(10, decimals + 1)
  if (n2.toString() === '0') return 0
  const num = n1.mul(new BN(divisor.toString())).div(n2)
  if (num.gte(new BN(divisor.toString()))) return 1
  return num.toNumber() / divisor
}

export function displayShortAud(amount: BigNumber) {
  return formatNumber(amount.div(new BN('1000000000000000000') as BN))
}

export function displayAud(amount: BigNumber) {
  return formatAudString(getAud(amount))
}

export function getAud(amount: BigNumber) {
  const aud = amount.div(new BN('1000000000000000000'))
  const wei = amount.sub(aud.mul(new BN('1000000000000000000')))
  if (wei.isZero()) {
    return aud.toString()
  }
  const decimals = wei.toString().padStart(18, '0')
  return `${aud}.${trimRightZeros(decimals)}`
}

export function trimRightZeros(number: string) {
  return number.replace(/(\d)0+$/gm, '$1')
}

export function getWei(amount: BigNumber) {
  return amount.mul(new BN('1000000000000000000'))
}

type NodeMetadata = {
  version: string
  country: string
}

/**
 * @deprecated Replaced with methods below. Can be removed after all nodes update to version 0.3.58
 */
export async function getNodeMetadata(endpoint: string): Promise<NodeMetadata> {
  try {
    const { data } = await fetchWithTimeout(
      `${endpoint}/health_check?verbose=true`
    )
    const { version, country } = data
    return { version, country }
  } catch (e) {
    console.error(e)
    // Return no version if we couldn't find one, so we don't hold everything up
    return { version: '', country: '' }
  }
}

export async function getDiscoveryNodeMetadata(
  endpoint: string
): Promise<NodeMetadata> {
  try {
    const {
      data: { country },
      version: { version }
    } = await fetchWithTimeout(`${endpoint}/location?verbose=true`)
    return { version, country }
  } catch (e) {
    // Try legacy method:
    return await getNodeMetadata(endpoint)
  }
}

export async function getContentNodeMetadata(
  endpoint: string
): Promise<NodeMetadata> {
  try {
    const {
      data: { country, version }
    } = await fetchWithTimeout(`${endpoint}/version`)
    return { version, country }
  } catch (e) {
    // Try legacy method:
    return await getNodeMetadata(endpoint)
  }
}

export async function getValidatorMetadata(
  endpoint: string
): Promise<NodeMetadata> {
  try {
    const {
      data: { country, version }
    } = await fetchWithTimeout(`${endpoint}/version`)
    return { version, country }
  } catch (e) {
    // Try legacy method:
    return await getNodeMetadata(endpoint)
  }
}

export function decodeCallData(types: string[], callData: string) {
  // TODO: Like methods above and throughout, move to better pattern
  const web3 = window.audiusLibs.ethWeb3Manager!.web3
  return web3.eth.abi.decodeParameters(types, callData)
}

export function decodeProposalCallData(proposal: Proposal) {
  const signatureSplit = proposal.functionSignature.split('(')
  const functionName = signatureSplit?.[0]

  const types = signatureSplit?.[1]?.split(')')?.[0]?.split(',')
  if (!types) {
    return null
  }
  const decoded: { [key: string]: string } = AudiusClient.decodeCallData(
    types,
    proposal.callData
  )
  delete decoded.__length__

  const parsedCallData = Object.values(decoded)
  if (functionName === 'slash') {
    parsedCallData[0] = new BN(parsedCallData[0]).toString() + '(wei)'
  }
  const joinedCallData = parsedCallData.join(',')
  return joinedCallData
}
