import { useState, useEffect } from 'react'

import cn from 'classnames'

import Spinner from '../spinner/Spinner'

import styles from './Loading.module.css'

const Loading = () => {
  const [shouldRender, setShouldRender] = useState(false)
  useEffect(() => {
    setTimeout(() => {
      setShouldRender(true)
    }, 10)
  }, [])

  const [didLoad, setDidLoad] = useState(false)
  useEffect(() => {
    if (shouldRender) setDidLoad(true)
  }, [setDidLoad, shouldRender])

  if (!shouldRender) return null

  return (
    <div className={cn(styles.container, { [styles.didLoad]: didLoad })}>
      <Spinner />
    </div>
  )
}

export default Loading
