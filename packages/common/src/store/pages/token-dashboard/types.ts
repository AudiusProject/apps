import { PayloadAction } from '@reduxjs/toolkit'

import { Status } from '~/models'

import { Chain } from '../../../models/Chain'
import { WalletAddress } from '../../../models/Wallet'
import { Nullable } from '../../../utils/typeUtils'

export type ConnectWalletsState =
  | { stage: 'ADD_WALLET' }
  | { stage: 'REMOVE_WALLET' }

export type TokenDashboardPageModalState = Nullable<
  | { stage: 'CONNECT_WALLETS'; flowState: ConnectWalletsState }
  | { stage: 'DISCORD_CODE' }
>

export type AssociatedWallet = {
  address: string
  balance: bigint
}

export type AssociatedWallets = AssociatedWallet[]

export type ConfirmRemoveWalletAction = PayloadAction<{
  wallet: WalletAddress
  chain: Chain
}>

export type AssociatedWalletsState = {
  loadingStatus: Status
  status: Nullable<'Connecting' | 'Connected' | 'Confirming' | 'Confirmed'>
  connectedEthWallets: Nullable<AssociatedWallets>
  connectedSolWallets: Nullable<AssociatedWallets>
  confirmingWallet: {
    wallet: Nullable<WalletAddress>
    chain: Nullable<Chain>
    balance: Nullable<bigint>
    signature: Nullable<string>
  }
  errorMessage: Nullable<string>
  removeWallet: {
    wallet: Nullable<string>
    chain: Nullable<Chain>
    status: Nullable<'Confirming' | 'Confirmed'>
  }
}

export type TokenDashboardState = {
  modalState: Nullable<TokenDashboardPageModalState>
  modalVisible: boolean
  discordCode: Nullable<string>
  associatedWallets: AssociatedWalletsState
}
