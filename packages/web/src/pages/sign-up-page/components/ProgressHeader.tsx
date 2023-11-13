import {
  Box,
  Flex,
  IconAudiusLogoHorizontal,
  IconComponent,
  IconNote,
  IconUser,
  IconUserFollow
} from '@audius/harmony'
import { useRouteMatch } from 'react-router-dom'

import { SteppedProgress } from 'components/stepped-progress/SteppedProgress'
import {
  SIGN_UP_ARTISTS_PAGE,
  SIGN_UP_FINISH_PROFILE_PAGE,
  SIGN_UP_GENRES_PAGE,
  SIGN_UP_HANDLE_PAGE
} from 'utils/route'

import styles from './ProgressHeader.module.css'

type ProgressHeaderStep = 'customize' | 'genres' | 'artists'

const messages = {
  customize: 'Customize',
  genres: 'Genres',
  artists: 'Artists'
}

const STEPS: {
  key: ProgressHeaderStep
  label: string
  icon: IconComponent
}[] = [
  { key: 'customize', label: messages.customize, icon: IconUser },
  { key: 'genres', label: messages.genres, icon: IconNote },
  { key: 'artists', label: messages.artists, icon: IconUserFollow }
]

export const ProgressHeader = () => {
  const match = useRouteMatch()
  let activeStep: ProgressHeaderStep

  switch (match.path) {
    case SIGN_UP_HANDLE_PAGE:
    case SIGN_UP_FINISH_PROFILE_PAGE:
      activeStep = 'customize'
      break
    case SIGN_UP_GENRES_PAGE:
      activeStep = 'genres'
      break
    case SIGN_UP_ARTISTS_PAGE:
      activeStep = 'artists'
      break
    default:
      activeStep = 'customize'
  }

  return (
    <Flex
      alignItems='center'
      justifyContent='center'
      ph='xl'
      className={styles.container}
    >
      <div className={styles.logoContainer}>
        <IconAudiusLogoHorizontal height={24} width={100} color='subdued' />
      </div>
      <Box alignSelf='flex-end'>
        <SteppedProgress steps={STEPS} activeStep={activeStep} />
      </Box>
    </Flex>
  )
}
