import React from 'react'

import Page from 'components/Page'
import TopAPIAppsChart from 'components/TopAPIAppsChart'
import useOpenLink from 'hooks/useOpenLink'
import { createStyles } from 'utils/mobile'
import { AUDIUS_API_URL } from 'utils/routes'

import desktopStyles from './API.module.css'
import mobileStyles from './APIMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const messages = {
  title: 'API Leaderboard',
  imgBannerAlt: 'Audius API',
  cta: 'Learn more about the audius API'
}

type OwnProps = {}
type APIProps = OwnProps

const API: React.FC<APIProps> = () => {
  const onClickLearnMore = useOpenLink(AUDIUS_API_URL)
  return (
    <Page title={messages.title} className={styles.container}>
      <div className={styles.apiBanner}>
        <a
          href={AUDIUS_API_URL}
          className={styles.learnMore}
          onClick={onClickLearnMore}
        >
          {messages.cta}
        </a>
      </div>
      <TopAPIAppsChart className={styles.topAPIAppsChart} />
    </Page>
  )
}

export default API
