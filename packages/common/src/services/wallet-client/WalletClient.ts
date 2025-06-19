import { AUDIO, wAUDIO, AudioWei } from '@audius/fixed-decimal'
import { AudiusSdk, Id } from '@audius/sdk'

import { userWalletsFromSDK } from '~/adapters'
import { ID } from '~/models/Identifiers'
import { SolanaWalletAddress } from '~/models/Wallet'
import { isNullOrUndefined } from '~/utils/typeUtils'

import {
  AudiusBackend,
  getUserbankAccountInfo,
  pollForTokenBalanceChange
} from '../audius-backend'

export const MIN_TRANSFERRABLE_WEI = AUDIO('0.001').value

type WalletClientConfig = {
  audiusBackendInstance: AudiusBackend
  audiusSdk: () => Promise<AudiusSdk>
}

export class WalletClient {
  audiusBackendInstance: AudiusBackend
  audiusSdk: () => Promise<AudiusSdk>

  constructor(config: WalletClientConfig) {
    this.audiusBackendInstance = config.audiusBackendInstance
    this.audiusSdk = config.audiusSdk
  }

  /** Get user's current ETH Audio balance. Returns null on failure. */
  async getCurrentBalance({
    ethAddress
  }: {
    ethAddress: string
  }): Promise<AudioWei | null> {
    try {
      const sdk = await this.audiusSdk()
      const balance = await this.audiusBackendInstance.getBalance({
        ethAddress,
        sdk
      })
      return BigInt(balance?.toString() ?? 0) as AudioWei
    } catch (err) {
      console.error(err)
      return null
    }
  }

  /** Get user's current SOL Audio balance. Returns null on failure. */
  async getCurrentWAudioBalance({
    ethAddress
  }: {
    ethAddress: string
  }): Promise<AudioWei | null> {
    const sdk = await this.audiusSdk()
    const balance = await this.audiusBackendInstance.getWAudioBalance({
      ethAddress,
      sdk
    })
    return balance ? (BigInt(balance.toString()) as AudioWei) : null
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
  }): Promise<void> {
    const sdk = await this.audiusSdk()
    const account = await getUserbankAccountInfo(sdk, {
      ethAddress,
      mint: 'wAUDIO'
    })
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
      const permitTxHash = await sdk.services.audiusTokenClient.permit({
        args: {
          value: balance,
          spender: sdk.services.audiusWormholeClient.contractAddress
        }
      })
      console.debug(
        `Permitted AudiusWormhole to transfer ${balance} tokens...`,
        { permitTxHash }
      )
      const transferTxHash =
        await sdk.services.audiusWormholeClient.transferTokens({
          args: {
            amount: balance,
            recipientChain: 'Solana',
            recipient: `0x${account.address.toBuffer().toString('hex')}`
          }
        })
      console.debug(
        `AudiusWormhole transferred ${balance} tokens into the Wormhole...`,
        { transferTxHash }
      )

      // Note: At this point, the funds are sitting in Wormhole.
      // The recurring jobs box will index the AudiusWormhole contract and
      // auto-redeem the transfer.

      await pollForTokenBalanceChange(sdk, {
        commitment: 'finalized',
        tokenAccount: account?.address,
        initialBalance: account?.amount,
        mint: 'wAUDIO',
        retryDelayMs: 10000,
        maxRetryCount: 360 /* 60 minutes */
      })
    }
  }

  /** Get total balance of external wallets connected to the user's account. Returns null on failure. */
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
          // Convert SPL wAudio -> AUDIO
          return AUDIO(wAUDIO(balance)).value
        })
      ])

      // TODO: Remove once getAddressTotalStakedBalance is throwing for unexpected errors
      // and let the catch below handle things
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
              // wAUDIO balances use a different precision, and we want AudioWei as output to be consistent
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

  async sendWAudioTokens({
    address,
    amount,
    ethAddress
  }: {
    address: SolanaWalletAddress
    amount: AudioWei
    ethAddress: string
  }): Promise<void> {
    if (amount < MIN_TRANSFERRABLE_WEI) {
      throw new Error('Insufficient Audio to transfer')
    }
    try {
      const sdk = await this.audiusSdk()
      const { error } = await this.audiusBackendInstance.sendWAudioTokens({
        address,
        amount,
        ethAddress,
        sdk
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
        `Error sending sol wrapped audio amount ${amount.toString()} to ${address.toString()}` +
          `with error ${(err as Error).toString()}`
      )
      throw err
    }
  }
}
