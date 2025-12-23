import { ReactNode } from 'react'

import { Text } from '../../text'

import styles from './HelperText.module.css'

type HelperTextProps = {
  children: ReactNode
  error?: boolean
}

export const HelperText = (props: HelperTextProps) => {
  const { children, error } = props
  return (
    <div className={styles.root}>
      <Text variant='body' size='xs' color={error ? 'danger' : 'subdued'}>
        {children}
      </Text>
    </div>
  )
}
