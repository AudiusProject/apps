import React, { useEffect } from 'react'

import { IconComponent } from '@audius/harmony'
import clsx from 'clsx'
import { Spring } from 'react-spring/renderprops'

import { useIsMobile } from 'utils/hooks'
import { createStyles } from 'utils/mobile'

import desktopStyles from './Page.module.css'
import mobileStyles from './PageMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const FADE_DURATION = 200

interface PageProps {
  className?: string
  children: React.ReactNode
  title: string
  icon?: IconComponent
}

const Page = ({ className, children, title, icon }: PageProps) => {
  const isMobile = useIsMobile()
  const IconComponent = icon

  useEffect(() => {
    if (isMobile) {
      window.scrollTo(0, 0)
    }
  }, [isMobile])

  return (
    <Spring
      from={{ opacity: 0.2 }}
      to={{ opacity: 1 }}
      config={{ duration: FADE_DURATION }}
    >
      {(animProps) => (
        <div style={animProps}>
          <div className={styles.titleContainer}>
            {IconComponent == null ? null : <IconComponent color='inverse' />}
            <h1 className={styles.title}>{title}</h1>
          </div>
          <div className={clsx({ [className!]: !!className })}>{children}</div>
        </div>
      )}
    </Spring>
  )
}

export default Page
