import React, { useRef, useCallback, useEffect } from 'react'

import type { Toast as ToastType } from '@audius/common/store'
import { toastActions } from '@audius/common/store'
import { Link } from '@react-navigation/native'
import { Animated, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch } from 'react-redux'

import { Text } from 'app/components/core'
import { makeStyles } from 'app/styles'
import { zIndex } from 'app/utils/zIndex'

const { dismissToast } = toastActions

const DEFAULT_TIMEOUT = 3000
const DISTANCE_DOWN = 60

const springConfig = {
  tension: 125,
  friction: 20
}

const useStyles = makeStyles(({ palette, spacing }) => ({
  root: {
    zIndex: zIndex.TOAST,
    alignItems: 'center',
    justifyContent: 'center'
  },
  toast: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.secondary,
    borderRadius: 8
  },
  contentRoot: {
    paddingTop: spacing(3) + 2,
    paddingBottom: spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing(4),
    paddingRight: spacing(4)
  },
  content: {
    color: palette.staticWhite,
    fontSize: 14
  },
  link: {
    textDecorationLine: 'underline'
  }
}))

type ToastProps = {
  toast: ToastType
}

export const Toast = (props: ToastProps) => {
  const { toast } = props
  const {
    content,
    timeout = DEFAULT_TIMEOUT,
    key,
    linkConfig,
    linkText
  } = toast
  const styles = useStyles()
  const toastAnimation = useRef(new Animated.Value(0))
  const insets = useSafeAreaInsets()
  const dispatch = useDispatch()

  const handleDismiss = useCallback(() => {
    dispatch(dismissToast({ key }))
  }, [dispatch, key])

  const animateOut = useCallback(() => {
    Animated.spring(toastAnimation.current, {
      ...springConfig,
      toValue: 0,
      useNativeDriver: true
    }).start(handleDismiss)
  }, [handleDismiss])

  const animateIn = useCallback(() => {
    Animated.spring(toastAnimation.current, {
      ...springConfig,
      toValue: 1,
      useNativeDriver: true
    }).start(() => {
      if (timeout !== 'MANUAL') {
        setTimeout(() => {
          animateOut()
        }, timeout)
      }
    })
  }, [animateOut, timeout])

  useEffect(() => {
    animateIn()
  }, [animateIn])

  const opacityStyle = toastAnimation.current.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  })

  const translateYStyle = toastAnimation.current.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(DISTANCE_DOWN, insets.top + 20)]
  })

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.toast,
          {
            opacity: opacityStyle,
            transform: [{ translateY: translateYStyle }]
          }
        ]}
      >
        {typeof content === 'string' ? (
          <View style={styles.contentRoot}>
            <Text style={styles.content} weight='demiBold'>
              {content}
              {linkText && linkConfig ? (
                <>
                  {' '}
                  <Link
                    style={styles.link}
                    screen={linkConfig.screen as string}
                    params={linkConfig.params as Record<string, unknown>}
                  >
                    {linkText}
                  </Link>
                </>
              ) : null}
            </Text>
          </View>
        ) : (
          content
        )}
      </Animated.View>
    </View>
  )
}
