import snakecaseKeys from 'snakecase-keys'

import { ResourceContributor } from '~/models/Track'

export const resourceContributorFromSDK = (
  input: object
): ResourceContributor => {
  return snakecaseKeys(input) as ResourceContributor
}
