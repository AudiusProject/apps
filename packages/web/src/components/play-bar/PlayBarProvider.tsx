import {
  modalsSelectors,
  playerSelectors,
  getCurrentTrackId,
  getLineupId
} from '@audius/common/store'
import cn from 'classnames'
import { connect } from 'react-redux'

import NowPlayingDrawer from 'components/now-playing/NowPlayingDrawer'
import { useIsMobile } from 'hooks/useIsMobile'
import { AppState } from 'store/types'

import styles from './PlayBarProvider.module.css'
import DesktopPlayBar from './desktop/PlayBar'
import DesktopPlayBarNew from './desktop/PlayBarNew'
const { getUid: getPlayingUid } = playerSelectors
const { getModalVisibility } = modalsSelectors

type OwnProps = {
  isMobile: boolean
}

type PlayBarProviderProps = OwnProps & ReturnType<typeof mapStateToProps>

const PlayBarProvider = ({
  playingUid,
  addToCollectionOpen,
  currentTrackId,
  lineupId
}: PlayBarProviderProps) => {
  const isMobile = useIsMobile()

  // Use new PlayBar if new playback system is active, otherwise use old one
  const useNewPlayBar = !!currentTrackId && !!lineupId
  const hasOldPlayer = !!playingUid

  return (
    <div
      className={cn(styles.playBarWrapper, {
        [styles.isMobile]: isMobile
      })}
    >
      {isMobile ? (
        <NowPlayingDrawer
          isPlaying={!!playingUid || !!currentTrackId}
          shouldClose={addToCollectionOpen === true}
        />
      ) : (
        <>
          <div className={styles.customHr} />
          {useNewPlayBar ? (
            <DesktopPlayBarNew />
          ) : hasOldPlayer ? (
            <DesktopPlayBar />
          ) : null}
        </>
      )}
    </div>
  )
}

function mapStateToProps(state: AppState) {
  return {
    playingUid: getPlayingUid(state),
    addToCollectionOpen: getModalVisibility(state, 'AddToCollection'),
    currentTrackId: getCurrentTrackId(state),
    lineupId: getLineupId(state)
  }
}

export default connect(mapStateToProps)(PlayBarProvider)
