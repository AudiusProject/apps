import { useCurrentTrack } from '@audius/common/hooks'
import { Genre } from '@audius/common/utils'

import BackwardSkipButton, {
  BackwardSkipButtonProps
} from './BackwardSkipButton'
import PreviousButton, { PreviousButtonProps } from './PreviousButton'

type PreviousButtonProviderProps = PreviousButtonProps | BackwardSkipButtonProps

const PreviousButtonProvider = (props: PreviousButtonProviderProps) => {
  const track = useCurrentTrack()
  const isLongFormContent =
    track?.genre === Genre.PODCASTS || track?.genre === Genre.AUDIOBOOKS
  return isLongFormContent ? (
    <BackwardSkipButton {...props} />
  ) : (
    <PreviousButton {...props} />
  )
}

export default PreviousButtonProvider
