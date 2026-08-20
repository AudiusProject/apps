import AudiusLogoGlyph from '../../assets/img/audiusLogoGlyph.svg'
import PlayButton, { PlayingState } from '../playbutton/PlayButton'

import styles from './DeletedContentTiny.module.css'

const messages = {
  deletedBy: 'Track Deleted By Artist',
  deleted: 'Deleted',
  unavailable: 'Track Unavailable'
}

const DeletedContentTiny = ({ onClick, isBlocked, isUnavailable }) => {
  // `unavailable` says nothing about the account on purpose: the same flag
  // covers a self deactivation and a delisted account.
  const label = isUnavailable
    ? messages.unavailable
    : isBlocked
      ? messages.deleted
      : messages.deletedBy

  return (
    <div className={styles.wrapper}>
      <PlayButton
        playingState={PlayingState.Stopped}
        className={styles.playButton}
      />
      <div className={styles.container} onClick={onClick}>
        <div className={styles.info}>{label}</div>
        <AudiusLogoGlyph className={styles.logo} />
      </div>
    </div>
  )
}

export default DeletedContentTiny
