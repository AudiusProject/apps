import { Pages } from '@audius/web/src/common/store/pages/signon/types'

type GetSignOnScreenParams = {
  page: Pages
  hasHandle: boolean
}

export type ResumableSignOnScreen =
  | 'CreatePassword'
  | 'PickHandle'
  | 'FinishProfile'

/** Maps shared sign-on state to the equivalent native navigation screen. */
export const getSignOnScreen = ({
  page,
  hasHandle
}: GetSignOnScreenParams): ResumableSignOnScreen | null => {
  switch (page) {
    case Pages.PASSWORD:
      return 'CreatePassword'
    case Pages.PROFILE:
      return hasHandle ? 'FinishProfile' : 'PickHandle'
    default:
      return null
  }
}
