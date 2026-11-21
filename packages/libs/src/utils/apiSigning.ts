import assert from 'assert'

import type Web3Type from 'web3'

import Web3 from '../LibsWeb3'

const web3Instance = new Web3()

export async function hashAndSign(input: string, privateKey: string) {
  const toSignHash = web3Instance.utils.keccak256(input)
  const signedMessage = await web3Instance.eth.accounts.sign(
    toSignHash,
    privateKey
  )
  return signedMessage.signature
}

interface WalletResponse {
  signature: string
  signer: string
}

export function recoverWallet(web3: Web3Type, response: WalletResponse) {
  let recoveredDelegateWallet = null

  const dataForRecovery = JSON.parse(JSON.stringify(response))
  delete dataForRecovery.signature
  const dataForRecoveryStr = JSON.stringify(sortObjectKeys(dataForRecovery))

  try {
    const hashedData = web3.utils.keccak256(dataForRecoveryStr)
    recoveredDelegateWallet = web3.eth.accounts.recover(
      hashedData,
      response.signature
    )

    assert.strictEqual(response.signer, recoveredDelegateWallet)
  } catch (e) {
    console.error(`Issue with recovering public wallet address: ${e}`)
  }

  return recoveredDelegateWallet
}

type ValueOrArray<T> = undefined | string | number | T | Array<ValueOrArray<T>>
type SortObject = ValueOrArray<Record<string, string | number>>

export function sortObjectKeys(x: SortObject): SortObject {
  if (typeof x !== 'object' || !x) {
    return x
  }
  if (Array.isArray(x)) {
    return x.map(sortObjectKeys)
  }
  return Object.keys(x)
    .sort()
    .reduce((o, k) => ({ ...o, [k]: sortObjectKeys(x[k]) }), {})
}
