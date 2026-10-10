import { FEED_PAGE, TRENDING_PAGE } from '@audius/common/src/utils/route'

export const getSignUpCompletionRoute = (completionRoute: string) => {
  if (completionRoute === FEED_PAGE) {
    return TRENDING_PAGE
  }

  return completionRoute ? completionRoute : TRENDING_PAGE
}
