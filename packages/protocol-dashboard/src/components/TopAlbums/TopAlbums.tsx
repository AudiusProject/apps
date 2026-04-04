import React, { useCallback } from 'react'

import Error from 'components/Error'
import Loading from 'components/Loading'
import Paper from 'components/Paper'
import { useTopAlbums } from 'store/cache/music/hooks'
import { MusicError } from 'store/cache/music/slice'

import styles from './TopAlbums.module.css'

const messages = {
  title: 'Top Albums This Week'
}

type TopAlbumsProps = {}

const TopAlbums: React.FC<TopAlbumsProps> = () => {
  const { topAlbums } = useTopAlbums()
  const goToUrl = useCallback((url: string) => {
    window.open(url, '_blank')
  }, [])

  const renderTopAlbums = () => {
    if (topAlbums === MusicError.ERROR) return <Error />
    return topAlbums ? (
      topAlbums.map((p, i) => (
        <div key={i} className={styles.album} onClick={() => goToUrl(p.url)}>
          <div
            className={styles.artwork}
            onClick={() => goToUrl(p.url)}
            style={{
              backgroundImage: `url(${p.artwork})`
            }}
          />
          <div className={styles.text}>
            <div className={styles.albumTitle}>{p.title}</div>
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
      <div className={styles.albums}>{renderTopAlbums()}</div>
    </Paper>
  )
}

export default TopAlbums
