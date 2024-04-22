import React from 'react'

import Page from 'components/Page'
import RewardsCTABanner from 'components/RewardsCTABanner'
import TopAPITable from 'components/TopAPITable'

import styles from './APILeaderboard.module.css'

const messages = {
  title: 'API Leaderboard',
  imgBannerAlt: 'Audius API',
  cta: 'Learn more about the audius API'
}

type OwnProps = {}
type APILeaderboardProps = OwnProps

const APILeaderboard: React.FC<APILeaderboardProps> = () => {
  return (
    <Page title={messages.title} className={styles.container}>
      <RewardsCTABanner className={styles.rewardsCTABanner} />
      <TopAPITable className={styles.topAPITable} />
    </Page>
  )
}

export default APILeaderboard
