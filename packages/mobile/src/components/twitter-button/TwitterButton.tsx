import { useCallback } from 'react'

import { useTwitterButtonStatus } from '@audius/common/hooks'
import { cacheUsersActions, cacheUsersSelectors } from '@audius/common/store'
import { makeTwitterShareUrl } from '@audius/common/utils'
import type { Nullable } from '@audius/common/utils'
import { useDispatch, useSelector } from 'react-redux'

import { IconTwitter } from '@audius/harmony-native'
import type { ButtonProps } from 'app/components/core'
import { Button, useLink, useOnOpenLink } from 'app/components/core'
import { make, track } from 'app/services/analytics'
import { makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import type { AllEvents } from 'app/types/analytics'
const { getUser } = cacheUsersSelectors
const { fetchUserSocials } = cacheUsersActions

const messages = {
  share: 'Share to Twitter'
}

const useStyles = makeStyles(({ palette }) => ({
  root: {
    backgroundColor: palette.staticTwitterBlue
  }
}))

type StaticTwitterProps = {
  type: 'static'
  shareText: string
  analytics?: AllEvents
}

type DynamicTwitterProps = {
  type: 'dynamic'
  handle: string
  additionalHandle?: string
  shareData: (
    twitterHandle?: Nullable<string>,
    otherHandle?: Nullable<string>
  ) => Nullable<{
    shareText: string
    analytics: AllEvents
  }>
}

export type TwitterButtonProps = Partial<ButtonProps> & { url?: string } & (
    | StaticTwitterProps
    | DynamicTwitterProps
  )

export const TwitterButton = (props: TwitterButtonProps) => {
  const { url = null, style, IconProps, ...other } = props
  const { size } = other
  const styles = useStyles()
  const openLink = useOnOpenLink()
  const dispatch = useDispatch()

  const user = useSelector((state) =>
    getUser(state, { handle: 'handle' in other ? other.handle : undefined })
  )

  const additionalUser = useSelector((state) =>
    getUser(state, {
      handle: 'additionalHandle' in other ? other.additionalHandle : undefined
    })
  )

  const {
    userName,
    additionalUserName,
    shareTwitterStatus,
    twitterHandle,
    additionalTwitterHandle,
    setLoading,
    setIdle
  } = useTwitterButtonStatus(user, additionalUser)

  const { onPress: onPressLink } = useLink(
    other.type === 'static' ? makeTwitterShareUrl(url, other.shareText) : ''
  )

  const handlePress = useCallback(() => {
    onPressLink()
    if (other.type === 'static' && other.analytics) {
      track(make(other.analytics))
    }
    if (other.type === 'dynamic') {
      dispatch(fetchUserSocials(other.handle))
      if (other.additionalHandle) {
        dispatch(fetchUserSocials(other.additionalHandle))
      }
      setLoading()
    }
  }, [onPressLink, other, dispatch, setLoading])

  if (other.type === 'dynamic' && shareTwitterStatus === 'success') {
    const handle = twitterHandle ? `@${twitterHandle}` : userName
    const otherHandle = other.additionalHandle
      ? additionalTwitterHandle
        ? `@${additionalTwitterHandle}`
        : additionalUserName
      : null

    const twitterData = other.shareData(handle, otherHandle)

    if (twitterData) {
      const { shareText, analytics } = twitterData
      openLink(makeTwitterShareUrl(url, shareText))
      track(make(analytics))
      setIdle()
    }
  }

  return (
    <Button
      style={[styles.root, style]}
      iconLeft={IconTwitter}
      onPress={handlePress}
      IconProps={{
        ...(size === 'large'
          ? { height: spacing(6), width: spacing(6) }
          : null),
        ...IconProps
      }}
      {...other}
    >
      {messages.share}
    </Button>
  )
}
