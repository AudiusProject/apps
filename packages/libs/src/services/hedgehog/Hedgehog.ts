import {
  Hedgehog as HedgehogBase,
  WalletManager,
  getPlatformCreateKey
} from '@audius/hedgehog'
import type { SetAuthFn, SetUserFn, GetFn, CreateKey } from '@audius/hedgehog'

import type { LocalStorage } from '../../utils/localStorage'
import type { IdentityService } from '../identity'

export type HedgehogConfig = {
  identityService: IdentityService
  useLocalStorage?: boolean
  localStorage?: LocalStorage
  createKey?: CreateKey
}

export class Hedgehog {
  identityService: IdentityService
  getFn: IdentityService['getFn']
  setAuthFn: SetAuthFn
  setUserFn: SetUserFn
  instance: HedgehogBase

  constructor({
    identityService,
    useLocalStorage = true,
    localStorage,
    createKey = getPlatformCreateKey()
  }: HedgehogConfig) {
    this.identityService = identityService

    this.getFn = async (obj) => {
      return await this.identityService.getFn(obj)
    }

    this.setAuthFn = async (obj) => {
      return await this.identityService.setAuthFn(obj)
    }

    this.setUserFn = async (obj) => {
      return await this.identityService.setUserFn(obj)
    }

    const hedgehog = new HedgehogBase(
      this.getFn as GetFn,
      this.setAuthFn,
      this.setUserFn,
      useLocalStorage,
      localStorage,
      createKey
    )

    // @ts-expect-error -- adding our own custom method to hedgehog
    hedgehog.generateRecoveryInfo = async () => {
      const entropy = await WalletManager.getEntropyFromLocalStorage(
        hedgehog.localStorage
      )
      if (entropy === null) {
        throw new Error('generateRecoveryLink - missing entropy')
      }
      let btoa
      let currentHost
      if (typeof window !== 'undefined' && window && window.btoa) {
        btoa = window.btoa
        currentHost = window.location.origin
      } else {
        btoa = (str: string) => Buffer.from(str, 'binary').toString('base64')
        currentHost = 'localhost'
      }
      const recoveryInfo = { login: btoa(entropy), host: currentHost }
      return recoveryInfo
    }

    // @ts-expect-error -- adding our own custom method to hedgehog
    hedgehog.getLookupKey = async ({
      username,
      password
    }: {
      username: string
      password: string
    }) => {
      return await WalletManager.createAuthLookupKey(
        username,
        password,
        hedgehog.createKey
      )
    }

    this.instance = hedgehog
  }
}
