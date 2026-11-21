import React from 'react'

import { TabName, TabProps } from './types'

export function Tab<T extends TabName>({ children }: TabProps<T>) {
  return <>{children}</>
}
