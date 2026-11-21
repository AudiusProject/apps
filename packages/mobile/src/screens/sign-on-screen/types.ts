import type { SignOnScreenParams } from './screens/SignOnScreen'

export type SignOnScreenParamList = {
  SignOn: SignOnScreenParams

  ConfirmEmail: undefined

  CreatePassword: undefined
  PickHandle: undefined
  FinishProfile: undefined
  SelectGenre: undefined
  SelectArtists: undefined
  ReviewHandle: undefined
  AccountLoading: undefined

  HomeStack: { screen: 'Trending' }
}
