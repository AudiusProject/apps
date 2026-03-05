import { ReactNode } from 'react'

import { Paper } from '@audius/harmony'
import cn from 'classnames'

import styles from '../OAuthLoginPage.module.css'
import { Display } from '../types'

export const ContentWrapper = ({
  display,
  children
}: {
  display: Display
  children: ReactNode
}) => (
  <div className={cn(styles.wrapper, { [styles.popup]: display === 'popup' })}>
    {display === 'popup' ? (
      children
    ) : (
      <Paper
        shadow='mid'
        w='375px'
        direction='column'
        mv='3xl'
        alignSelf='flex-start'
        border='strong'
        borderRadius='xl'
      >
        {children}
      </Paper>
    )}
  </div>
)
