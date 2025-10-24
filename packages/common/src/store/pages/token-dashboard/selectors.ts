import { CommonState } from '../../commonStore'

export const getModalState = (state: CommonState) =>
  state.pages.tokenDashboard.modalState
export const getModalVisible = (state: CommonState) =>
  state.pages.tokenDashboard.modalVisible
export const getDiscordCode = (state: CommonState) =>
  state.pages.tokenDashboard.discordCode ?? ''
export const getAssociatedWallets = (state: CommonState) =>
  state.pages.tokenDashboard.associatedWallets
export const getHasAssociatedWallets = (state: CommonState) => {
  const { connectedEthWallets: ethWallets, connectedSolWallets: solWallets } =
    state.pages.tokenDashboard.associatedWallets
  return (ethWallets?.length ?? 0) + (solWallets?.length ?? 0) > 0
}
export const getRemoveWallet = (state: CommonState) =>
  state.pages.tokenDashboard.associatedWallets.removeWallet
export const getConfirmingWallet = (state: CommonState) =>
  state.pages.tokenDashboard.associatedWallets.confirmingWallet

export const getError = (state: CommonState) =>
  state.pages.tokenDashboard.associatedWallets.errorMessage

export const getConfirmingWalletStatus = (state: CommonState) =>
  state.pages.tokenDashboard.associatedWallets.status
