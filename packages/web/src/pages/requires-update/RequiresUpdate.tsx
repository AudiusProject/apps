import { Box, Button } from '@audius/harmony'

import tileBackground from 'assets/img/notFoundTiledBackround.png'

import styles from './RequiresUpdate.module.css'

const messages = {
  title: 'Please Update ✨',
  subtitle: "The version of Audius you're running is too far behind.",
  buttonUpdate: 'UPDATE NOW',
  buttonIsUpdating: 'UPDATING'
}

type RequiresUpdateProps = {
  isUpdating: boolean
  onUpdate: () => void
}

export const RequiresUpdate = (props: RequiresUpdateProps) => {
  const { isUpdating, onUpdate } = props
  return (
    <div className={styles.requiresUpdate}>
      <div
        className={styles.content}
        css={(theme) => ({
          backgroundImage: `url(${tileBackground})`,
          backgroundBlendMode: theme.type === 'day' ? 'none' : 'color-burn'
        })}
      >
        <div className={styles.title}>{messages.title}</div>
        <div className={styles.subtitle}>{messages.subtitle}</div>
        <Box>
          <Button variant='primary' isLoading={isUpdating} onClick={onUpdate}>
            {isUpdating ? messages.buttonIsUpdating : messages.buttonUpdate}
          </Button>
        </Box>
      </div>
    </div>
  )
}
