import type { SignOnScreenParams } from './screens/SignOnScreen'

export type SignOnScreenParamList = {
  SignOn: SignOnScreenParams

  // Sign In
  ConfirmEmail: undefined

  // Sign Up
  CreatePassword: undefined
  PickHandle: undefined
  FinishProfile: undefined
  SelectGenre: undefined
  SelectArtists: undefined
  ReviewHandle: undefined
  AccountLoading: undefined

  // For leaving signup
  HomeStack: { screen: 'Trending' }
}
