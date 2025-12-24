import { route } from '@audius/common/utils'
import { Button, IconArrowRight } from '@audius/harmony'
import cn from 'classnames'
import { Link } from 'react-router'

import styles from './DeactivatedProfileTombstone.module.css'

const { HOME_PAGE } = route

const messages = {
  helpText: 'This Account No Longer Exists',
  buttonText: 'Take Me Back To The Music'
}

export const DeactivatedProfileTombstone = ({
  isMobile = false
}: {
  isMobile?: boolean
}) => {
  return (
    <div className={cn(styles.deactivated, { [styles.mobile]: isMobile })}>
      <div className={styles.deactivatedText}>{messages.helpText}</div>
      <Button
        variant='primary'
        fullWidth={isMobile}
        asChild
        iconRight={IconArrowRight}
      >
        <Link to={HOME_PAGE}>{messages.buttonText}</Link>
      </Button>
    </div>
  )
}
