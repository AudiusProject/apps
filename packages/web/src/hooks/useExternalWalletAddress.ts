import { appkitModal } from 'app/ReownAppKitModal'

export const useExternalWalletAddress = () => {
  const externalWalletAccount = appkitModal.getAccount('solana')
  return externalWalletAccount?.address
}
