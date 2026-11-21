import { AUDIO, wAUDIO, AudioWei } from '@audius/fixed-decimal'
import { type AudiusSdkWithServices, Id } from '@audius/sdk'
import type { PublicKey } from '@solana/web3.js'

import { userWalletsFromSDK } from '~/adapters'
import { ID } from '~/models/Identifiers'
import { SolanaWalletAddress } from '~/models/Wallet'
import { isNullOrUndefined } from '~/utils/typeUtils'

import type { AudiusBackend } from '../audius-backend'
import { Env } from '../env'

export const MIN_TRANSFERRABLE_WEI = AUDIO('0.001').value

type WalletClientConfig = {
  audiusBackendInstance: AudiusBackend
  audiusSdk: () => Promise<AudiusSdkWithServices>
  env: Env
}

export class WalletClient {
  audiusBackendInstance: AudiusBackend
  audiusSdk: () => Promise<AudiusSdkWithServices>
  env: Env

  constructor(config: WalletClientConfig) {
    this.audiusBackendInstance = config.audiusBackendInstance
    this.audiusSdk = config.audiusSdk
    this.env = config.env
  }

  async getAssociatedTokenAccountInfo({ address }: { address: string }) {
    try {
      const sdk = await this.audiusSdk()
      const tokenAccountInfo =
        await this.audiusBackendInstance.getAssociatedTokenAccountInfo({
          address,
          sdk
        })
      return tokenAccountInfo
    } catch (err) {
      console.error(err)
      return null
    }
  }

  async transferTokensFromEthToSol({
    ethAddress
  }: {
    ethAddress: string
  }): Promise<string> {
    const [{ getAccount }, { pollForTokenBalanceChange }] = await Promise.all([
      import('@solana/spl-token'),
      import('../audius-backend/solana')
    ])
    const sdk = await this.audiusSdk()
    const { userBank } =
      await sdk.services.claimableTokensClient.getOrCreateUserBank({
        ethWallet: ethAddress,
        mint: 'wAUDIO'
      })
    const account = await getAccount(
      await sdk.services.solanaClient.getConnection(),
      userBank
    )
    if (!account) {
      throw new Error('No userbank account.')
    }

    const ercAudioBalance = BigInt(
      (
        await this.audiusBackendInstance.getBalance({
          ethAddress,
          sdk
        })
      )?.toString() ?? 0
    ) as AudioWei

    if (!isNullOrUndefined(ercAudioBalance) && ercAudioBalance > BigInt(0)) {
      const balance = ercAudioBalance

      const ethereum = sdk.services.ethereum

      const permitTxHash = await ethereum.permitAudioToken({
        spender: ethereum.audiusWormhole.address,
        value: balance
      })
      console.debug(
        `Permitted AudiusWormhole to transfer ${balance} tokens...`,
        { permitTxHash }
      )

      const permitReceipt =
        await ethereum.publicClient.waitForTransactionReceipt({
          hash: permitTxHash
        })
      if (permitReceipt.status !== 'success') {
        throw new Error('AUDIO permit transaction failed.')
      }

      const transferTxHash = await ethereum.wormholeTransferTokens({
        amount: balance,
        recipient: `0x${account.address.toBuffer().toString('hex')}`
      })
      console.debug(
        `AudiusWormhole transferred ${balance} tokens into the Wormhole...`,
        { transferTxHash }
      )

      pollForTokenBalanceChange(sdk, {
        commitment: 'finalized',
        tokenAccount: account?.address,
        initialBalance: account?.amount,
        mint: 'wAUDIO',
        retryDelayMs: 10000,
        maxRetryCount: 360
      }).catch((error) => {
        console.error('Polling for token balance change failed:', error)
      })

      return transferTxHash
    }

    throw new Error('No ERC-20 AUDIO balance to transfer')
  }

  async getAssociatedWalletBalance(userID: ID): Promise<AudioWei | null> {
    try {
      const sdk = await this.audiusSdk()
      const { data } = await sdk.users.getConnectedWallets({
        id: Id.parse(userID)
      })

      if (!data) {
        throw new Error('Unable to fetch associated wallets')
      }
      const associatedWallets = userWalletsFromSDK(data)
      const balances = await Promise.all([
        ...associatedWallets.wallets.map(async (wallet) => {
          const balance =
            await this.audiusBackendInstance.getAddressTotalStakedBalance(
              wallet,
              sdk
            )
          return BigInt(balance?.toString() ?? 0) as AudioWei
        }),
        ...associatedWallets.sol_wallets.map(async (wallet) => {
          const balance =
            await this.audiusBackendInstance.getAddressWAudioBalance({
              address: wallet,
              sdk
            })
          return AUDIO(wAUDIO(balance)).value
        })
      ])

      if (balances.some((b) => isNullOrUndefined(b))) {
        throw new Error(
          'Unable to fetch balance for one or more associated wallets.'
        )
      }

      const totalBalance = balances.reduce(
        (sum, walletBalance) => sum + walletBalance,
        BigInt(0)
      ) as AudioWei
      return totalBalance
    } catch (err) {
      console.error(err)
      return null
    }
  }

  async getEthWalletBalances(
    wallets: string[]
  ): Promise<{ address: string; balance: AudioWei }[]> {
    try {
      const sdk = await this.audiusSdk()
      const balances: { address: string; balance: AudioWei }[] =
        await Promise.all(
          wallets.map(async (wallet) => {
            const balance =
              await this.audiusBackendInstance.getAddressTotalStakedBalance(
                wallet,
                sdk
              )
            return {
              address: wallet,
              balance: BigInt(balance?.toString() ?? 0) as AudioWei
            }
          })
        )
      return balances
    } catch (err) {
      console.error(err)
      return []
    }
  }

  async getSolWalletBalances(
    wallets: string[]
  ): Promise<{ address: string; balance: AudioWei }[]> {
    try {
      const sdk = await this.audiusSdk()
      const balances: { address: string; balance: AudioWei }[] =
        await Promise.all(
          wallets.map(async (wallet) => {
            const balance =
              await this.audiusBackendInstance.getAddressWAudioBalance({
                address: wallet,
                sdk
              })
            return {
              address: wallet,
              balance: AUDIO(wAUDIO(balance)).value
            }
          })
        )
      return balances
    } catch (err) {
      console.error(err)
      return []
    }
  }

  async getWalletSolBalance({
    address
  }: {
    address: string
  }): Promise<AudioWei> {
    try {
      const sdk = await this.audiusSdk()
      const balance = await this.audiusBackendInstance.getAddressSolBalance({
        address,
        sdk
      })
      return BigInt(balance.toString()) as AudioWei
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async sendTokens({
    address,
    amount,
    ethAddress,
    mint
  }: {
    address: SolanaWalletAddress
    amount: AudioWei
    ethAddress: string
    mint: PublicKey
  }): Promise<void> {
    if (amount < MIN_TRANSFERRABLE_WEI) {
      throw new Error('Insufficient tokens to transfer')
    }
    try {
      const sdk = await this.audiusSdk()
      const { error } = await this.audiusBackendInstance.sendTokens({
        address,
        amount,
        ethAddress,
        sdk,
        mint
      })
      if (error) {
        if (error === 'Missing social proof') {
          throw new Error(error)
        }
        if (
          error ===
          'Recipient has no $AUDIO token account. Please install Phantom-Wallet to create one.'
        ) {
          throw new Error(error)
        }
        throw error
      }
    } catch (err) {
      console.error(
        `Error sending tokens with mint ${mint} amount ${amount.toString()} to ${address.toString()}` +
          `with error ${(err as Error).toString()}`
      )
      throw err
    }
  }
}
