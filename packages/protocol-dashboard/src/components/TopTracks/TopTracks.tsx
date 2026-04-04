import React, { useCallback } from 'react'

import Error from 'components/Error'
import Loading from 'components/Loading'
import Paper from 'components/Paper'
import { useTopTracks } from 'store/cache/music/hooks'
import { MusicError } from 'store/cache/music/slice'
import { createStyles } from 'utils/mobile'

import desktopStyles from './TopTracks.module.css'
import mobileStyles from './TopTracksMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const messages = {
  title: 'Top Tracks This Week'
}

type TopTracksProps = {}

const TopTracks: React.FC<TopTracksProps> = () => {
  const { topTracks } = useTopTracks()
  const goToUrl = useCallback((url: string) => {
    window.open(url, '_blank')
  }, [])

  const renderTopTracks = () => {
    if (topTracks === MusicError.ERROR) return <Error />
    return topTracks ? (
      topTracks.map((t, i) => (
        <div key={i} className={styles.track}>
          <div
            className={styles.artwork}
            onClick={() => goToUrl(t.url)}
            style={{
              backgroundImage: `url(${t.artwork})`
            }}
          />
          <div className={styles.trackTitle} onClick={() => goToUrl(t.url)}>
            {t.title}
          </div>
          <div className={styles.handle} onClick={() => goToUrl(t.userUrl)}>
            {t.handle}
          </div>
        </div>
      ))
    ) : (
      <Loading className={styles.loading} />
    )
  }
  return (
    <Paper className={styles.container}>
      <div className={styles.title}>{messages.title}</div>
      <div className={styles.tracks}>{renderTopTracks()}</div>
    </Paper>
  )
}

export default TopTracks
