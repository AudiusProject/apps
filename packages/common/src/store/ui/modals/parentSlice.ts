import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import {
  BasicModalsState,
  Modals,
  TrackModalClosedActionPayload,
  TrackModalOpenedActionPayload
} from './types'

export const initialState: BasicModalsState = {
  TiersExplainer: { isOpen: false },
  TrendingRewardsExplainer: { isOpen: false },
  ChallengeRewards: { isOpen: false },
  ClaimAllRewards: { isOpen: false },
  LinkSocialRewardsExplainer: { isOpen: false },
  APIRewardsExplainer: { isOpen: false },
  TransferAudioMobileWarning: { isOpen: false },
  MobileConnectWalletsDrawer: { isOpen: false },
  Share: { isOpen: false },
  HCaptcha: { isOpen: false },
  BrowserPushPermissionConfirmation: { isOpen: false },
  AudioBreakdown: { isOpen: false },
  DeactivateAccountConfirmation: { isOpen: false },
  FeedFilter: { isOpen: false },
  PurchaseVendor: { isOpen: false },
  TrendingGenreSelection: { isOpen: false },
  SocialProof: { isOpen: false },
  EditFolder: { isOpen: false },
  EditTrack: { isOpen: false },
  SignOutConfirmation: { isOpen: false },
  Overflow: { isOpen: false },
  AddToCollection: { isOpen: false },
  DeletePlaylistConfirmation: { isOpen: false },
  DeleteTrackConfirmation: { isOpen: false },
  DuplicateAddConfirmation: { isOpen: false },
  FeatureFlagOverride: { isOpen: false },
  BuyAudio: { isOpen: false },
  BuyAudioRecovery: { isOpen: false },
  TransactionDetails: { isOpen: false },
  StripeOnRamp: { isOpen: false },
  InboxSettings: { isOpen: false },
  CommentSettings: { isOpen: false },
  LabelAccount: { isOpen: false },
  PrivateKeyExporter: { isOpen: false },
  LockedContent: { isOpen: false },
  PlaybackRate: { isOpen: false },
  ProfileActions: { isOpen: false },
  PublishContentModal: { isOpen: false },
  AlbumTrackRemoveConfirmation: { isOpen: false },
  PremiumContentPurchaseModal: { isOpen: false },
  CreateChatModal: { isOpen: false },
  ChatBlastModal: { isOpen: false },
  LeavingAudiusModal: { isOpen: false },
  InboxUnavailableModal: { isOpen: false },
  UploadConfirmation: { isOpen: false },
  EditAccessConfirmation: { isOpen: false },
  EarlyReleaseConfirmation: { isOpen: false },
  PublishConfirmation: { isOpen: false },
  HideContentConfirmation: { isOpen: false },
  ReplaceTrackConfirmation: { isOpen: false },
  ReplaceTrackProgress: { isOpen: false },
  WithdrawUSDCModal: { isOpen: false },
  USDCPurchaseDetailsModal: { isOpen: false },
  USDCTransactionDetailsModal: { isOpen: false },
  USDCManualTransferModal: { isOpen: false },
  CoinflowOnramp: { isOpen: false },
  AddCashModal: { isOpen: false },
  Welcome: { isOpen: false },
  CoinflowWithdraw: { isOpen: false },
  WaitForDownloadModal: { isOpen: false },
  ArtistPick: { isOpen: false },
  PayoutWallet: { isOpen: false },
  EditTrackFormOverflowMenu: { isOpen: false },
  ExternalWalletSignUp: { isOpen: false },
  ConnectedWallets: { isOpen: false },
  Announcement: { isOpen: false },
  Notification: { isOpen: false },
  DownloadTrackArchive: { isOpen: false },
  BuySellModal: { isOpen: false },
  HostRemixContest: { isOpen: false },
  FinalizeWinnersConfirmation: { isOpen: false },
  ReceiveTokensModal: { isOpen: false },
  SendTokensModal: { isOpen: false },
  CoinSuccessModal: { isOpen: false },
  ArtistCoinDetailsModal: { isOpen: false }
}

const slice = createSlice({
  name: 'application/ui/modals',
  initialState,
  reducers: {
    setVisibility: (
      state,
      action: PayloadAction<{
        modal: Modals
        visible: boolean | 'closing'
      }>
    ) => {
      const { modal, visible } = action.payload
      state[modal].isOpen = visible
    },
    trackModalOpened: (
      _state,
      _action: PayloadAction<TrackModalOpenedActionPayload>
    ) => {
      // handled by saga
    },
    trackModalClosed: (
      _state,
      _action: PayloadAction<TrackModalClosedActionPayload>
    ) => {
      // handled by saga
    }
  }
})

export const { setVisibility } = slice.actions

export const actions = slice.actions

export default slice.reducer
