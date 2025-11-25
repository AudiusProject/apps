import { ReactNode } from 'react'

import { Flex, IconComponent, Text } from '@audius/harmony'
import cn from 'classnames'
import { useNavigate } from 'react-router-dom'

import { BackButton } from 'components/back-button/BackButton'
import { HeaderGutter } from 'components/header/desktop/HeaderGutter'

import styles from './Header.module.css'

export type HeaderProps = {
  primary: ReactNode
  topLeftElement?: ReactNode // e.g. searchbar
  bottomBar?: ReactNode // e.g. tabs
  secondary?: ReactNode
  rightDecorator?: ReactNode
  containerStyles?: string
  showBackButton?: boolean
  onClickBack?: () => void
  children?: ReactNode
  isChromeOrSafari?: boolean
  scrollBarWidth?: number
  headerContainerRef?: React.RefObject<HTMLDivElement>
  icon?: IconComponent
}

export const Header = (props: HeaderProps) => {
  const navigate = useNavigate()
  const {
    primary,
    secondary = null,
    rightDecorator = null,
    topLeftElement = null,
    children,
    containerStyles = '',
    showBackButton = false,
    onClickBack,
    bottomBar,
    isChromeOrSafari,
    scrollBarWidth,
    headerContainerRef,
    icon: Icon
  } = props

  return (
    <>
      <HeaderGutter
        isChromeOrSafari={isChromeOrSafari}
        headerContainerRef={headerContainerRef}
        scrollBarWidth={scrollBarWidth}
      />
      <div
        className={cn(styles.container, {
          [containerStyles]: !!containerStyles
        })}
      >
        <Flex
          w='100%'
          direction='column'
          alignItems='flex-start'
          gap='l'
          mt='2xl'
          mb='l'
          css={{ maxWidth: 1080 }}
        >
          {topLeftElement || null}
          <Flex
            alignItems='center'
            justifyContent='space-between'
            w='100%'
            gap='m'
          >
            {showBackButton ? (
              <BackButton onClick={onClickBack ?? (() => navigate(-1))} />
            ) : null}
            <Flex alignItems='center' gap='m'>
              {Icon ? <Icon size='2xl' color='heading' /> : null}
              <Text
                variant='heading'
                tag='h1'
                strength='default'
                size='l'
                color='heading'
              >
                {primary}
              </Text>
            </Flex>
            {/* Padding to help align heading */}
            <Flex pt={6}>
              {typeof secondary === 'string' ? (
                <Text
                  variant='body'
                  color='default'
                  strength='default'
                  size='m'
                >
                  {secondary}
                </Text>
              ) : (
                secondary
              )}
            </Flex>
            <div className={styles.rightDecorator}>{rightDecorator}</div>
          </Flex>
        </Flex>
      </div>
      {children}
      {bottomBar && (
        <div className={styles.bottomBarContainer}>
          <div className={styles.bottomBar}>{bottomBar}</div>
        </div>
      )}
    </>
  )
}
