import React, { useCallback } from 'react'

import Error from 'components/Error'
import Loading from 'components/Loading'
import Paper from 'components/Paper'
import { useTopPlaylists } from 'store/cache/music/hooks'
import { MusicError } from 'store/cache/music/slice'

import styles from './TopPlaylists.module.css'

const messages = {
  title: 'Top Playlists This Week'
}

type TopPlaylistsProps = {}

const TopPlaylists: React.FC<TopPlaylistsProps> = () => {
  const { topPlaylists } = useTopPlaylists()
  const goToUrl = useCallback((url: string) => {
    window.open(url, '_blank')
  }, [])

  const renderTopPlaylists = () => {
    if (topPlaylists === MusicError.ERROR) return <Error />
    return topPlaylists ? (
      topPlaylists!.map((p, i) => (
        <div key={i} className={styles.playlist} onClick={() => goToUrl(p.url)}>
          <div
            className={styles.artwork}
            style={{
              backgroundImage: `url(${p.artwork})`
            }}
          />
          <div className={styles.text}>
            <div className={styles.playlistTitle}>{p.title}</div>
            <div className={styles.handle}>{p.handle}</div>
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
      <div className={styles.playlists}>{renderTopPlaylists()}</div>
    </Paper>
  )
}

export default TopPlaylists
