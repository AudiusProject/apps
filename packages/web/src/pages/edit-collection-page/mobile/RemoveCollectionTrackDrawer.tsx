import { BottomSheet, Button } from '@audius/harmony'

import styles from './RemoveCollectionTrackDrawer.module.css'

const messages = {
  title: `Are You Sure?`,
  description: (trackName: string) =>
    `Do you want to remove ${trackName} from this playlist?`,
  submit: 'Remove Track',
  cancel: 'Nevermind'
}

type RemovePlaylistTrackDrawerProps = {
  isOpen: boolean
  trackTitle?: string
  onClose: () => void
  onConfirm: () => void
}

const RemovePlaylistTrackDrawer = ({
  isOpen,
  onClose,
  trackTitle = '',
  onConfirm
}: RemovePlaylistTrackDrawerProps) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} ariaLabel={messages.title}>
      <div className={styles.drawer}>
        <h4 className={styles.title}>{messages.title}</h4>
        <div className={styles.description}>
          {messages.description(trackTitle)}
        </div>
        <Button variant='destructive' onClick={onConfirm} fullWidth>
          {messages.submit}
        </Button>
        <div className={styles.cancel} onClick={onClose}>
          {messages.cancel}
        </div>
      </div>
    </BottomSheet>
  )
}

export default RemovePlaylistTrackDrawer
