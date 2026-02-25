import { Box, Button, isLightTheme, useTheme } from '@audius/harmony'

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
  const theme = useTheme()
  const { isUpdating, onUpdate } = props
  return (
    <div className={styles.requiresUpdate}>
      <div
        className={styles.content}
        css={{
          backgroundImage: `url(${tileBackground})`,
          backgroundBlendMode: isLightTheme(theme.type) ? 'none' : 'color-burn'
        }}
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
