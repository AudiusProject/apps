import { useState, useEffect } from 'react'

import {
  selectIsAccountComplete,
  useCurrentAccountUser
} from '@audius/common/api'
import { Name } from '@audius/common/models'
import { useDispatch } from 'react-redux'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useTransition } from 'react-spring'

import { make } from 'common/store/analytics/actions'
import { localStorage } from 'services/local-storage'

const COMPLETION_DISMISSAL_DELAY_MSEC = 3 * 1000

interface CompletionStage {
  isCompleted: boolean
}

const getIsComplete = (completionStages: CompletionStage[]): boolean =>
  completionStages.every((cur) => cur.isCompleted)

interface ProfileCompletionDismissalProps {
  onDismiss: () => void
  isAccountLoaded: boolean
  completionStages: CompletionStage[]
  isDismissed: boolean
}

interface ProfileCompletionDismissalResult {
  isHidden: boolean
  shouldNeverShow: boolean
  didCompleteThisSession: boolean
}

export const useProfileCompletionDismissal = ({
  onDismiss,
  isAccountLoaded,
  completionStages,
  isDismissed
}: ProfileCompletionDismissalProps): ProfileCompletionDismissalResult => {
  const dispatch = useDispatch()
  const [didCompleteThisSession, setDidCompleteThisSession] = useState(false)
  const isComplete = getIsComplete(completionStages)
  const { data: accountUser } = useCurrentAccountUser()

  const accountTrackSavesLoaded =
    localStorage.getAudiusAccountSync()?.trackSaveCount !== null

  const isAccountComplete =
    selectIsAccountComplete(accountUser) && accountTrackSavesLoaded

  const [wasIncomplete, setWasIncomplete] = useState(false)
  useEffect(() => {
    if (
      isAccountLoaded &&
      completionStages.some((stage) => stage.isCompleted) &&
      completionStages.some((stage) => !stage.isCompleted) &&
      accountTrackSavesLoaded
    ) {
      setWasIncomplete(true)
    }
  }, [accountTrackSavesLoaded, completionStages, isAccountLoaded])

  const wasAlwaysComplete = isComplete && !wasIncomplete

  if (
    isAccountLoaded &&
    isComplete &&
    wasIncomplete &&
    !didCompleteThisSession
  ) {
    setDidCompleteThisSession(true)
    setTimeout(() => {
      onDismiss()
    }, COMPLETION_DISMISSAL_DELAY_MSEC)
    dispatch(make(Name.ACCOUNT_HEALTH_METER_FULL, {}))
  }

  const isHidden = !isAccountComplete || wasAlwaysComplete || isDismissed
  const shouldNeverShow = isHidden && wasAlwaysComplete
  return { isHidden, shouldNeverShow, didCompleteThisSession }
}

interface TransitionStyles {
  opacity?: number
  height?: number
  transformOrigin?: string
  [key: string]: any
}

export const useVerticalCollapse = (
  isVisible: boolean,
  originalHeight: number
) => {
  return useTransition<boolean, TransitionStyles>(isVisible, null, {
    from: { opacity: 1, height: originalHeight, transformOrigin: 'top center' },
    enter: {
      opacity: 1,
      height: originalHeight,
      transformOrigin: 'top center'
    },
    leave: { opacity: 0, height: 0, transformOrigin: 'top center' }
  })
}

export const useSlideDown = (isVisible: boolean, originalHeight: number) => {
  return useTransition<boolean, TransitionStyles>(isVisible, null, {
    from: { opacity: 1, height: originalHeight, transformOrigin: 'top center' },
    enter: {
      opacity: 1,
      height: originalHeight,
      transformOrigin: 'top center'
    },
    leave: [{ opacity: 0 }, { height: 0 }],
    config: { duration: 100 }
  })
}
