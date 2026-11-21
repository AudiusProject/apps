import * as util from 'util'

import { shuffle } from 'lodash'
import type { HttpProvider, AbstractProvider } from 'web3-core'
import type { JsonRpcPayload } from 'web3-core-helpers'

import Web3 from '../LibsWeb3'
const { callbackify, promisify } = util

const getSendMethod = (provider: HttpProvider | AbstractProvider) => {
  if ('sendAsync' in provider) {
    return provider.sendAsync
  }
  return provider.send
}

type Providers = [HttpProvider, ...Array<HttpProvider | AbstractProvider>]

export class MultiProvider extends Web3.providers.HttpProvider {
  providers: Providers
  constructor(providers: string[] | string) {
    let web3Providers: string[]
    if (typeof providers === 'string') {
      web3Providers = providers.split(',')
    } else if (!Array.isArray(providers)) {
      web3Providers = [providers]
    } else {
      web3Providers = providers
    }

    const web3ProviderInstances = web3Providers.map(
      (provider) => new Web3(provider).eth.currentProvider
    ) as Providers
    super(web3ProviderInstances[0]?.host)

    if (!web3ProviderInstances.every(getSendMethod)) {
      throw new Error('Some providers do not have a send method to use.')
    }

    this.providers = web3ProviderInstances

    this.send = callbackify(this._send.bind(this))
  }

  async _send(payload: JsonRpcPayload) {
    let lastError: Error | null = null

    for (const provider of shuffle(this.providers)) {
      try {
        const send = promisify(getSendMethod(provider).bind(provider))
        const result = await send(payload)
        return result
      } catch (e) {
        lastError = e as Error
      }
    }

    throw lastError || new Error('No RPC providers found')
  }
}
