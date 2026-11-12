import { MouseEvent, useCallback, useEffect, useState, useRef } from 'react'

import {
  stripeModalUIActions,
  stripeModalUISelectors
} from '@audius/common/store'
import { loadStripeOnramp, OnrampSession } from '@stripe/crypto'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import { env } from 'services/env'
import zIndex from 'utils/zIndex'

import styles from './StripeOnRampModal.module.css'

const STRIPE_PUBLISHABLE_KEY = env.STRIPE_CLIENT_PUBLISHABLE_KEY

const { getStripeModalState } = stripeModalUISelectors
const { cancelStripeOnramp, stripeSessionStatusChanged } = stripeModalUIActions

const MountStripeSession = ({ session }: { session: OnrampSession }) => {
  const dispatch = useDispatch()
  const el = useRef<HTMLDivElement>(null)

  const handleSessionUpdate = useCallback(
    (e: any) => {
      if (e?.payload?.session) {
        dispatch(stripeSessionStatusChanged({ session: e.payload.session }))
      }
    },
    [dispatch]
  )
  useEffect(() => {
    const mountedFrame = el.current?.querySelector('iframe')
    if (mountedFrame) {
      el.current?.removeChild(mountedFrame)
    }
    session.mount('#stripe-onramp-modal')
    session.addEventListener('onramp_session_updated', handleSessionUpdate)
    return () => {
      session.removeEventListener('onramp_session_updated', handleSessionUpdate)
    }
  }, [session, handleSessionUpdate])

  return (
    <div id='stripe-onramp-modal' ref={el} className={styles.stripeModal}></div>
  )
}

export const StripeOnRampModal = () => {
  const [isOpen] = useModalState('StripeOnRamp')
  const { stripeSessionStatus, stripeClientSecret } =
    useSelector(getStripeModalState)
  const [session, setSession] = useState<OnrampSession>()
  const dispatch = useDispatch()

  const handleBackgroundClicked = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (stripeSessionStatus !== 'fulfillment_processing') {
        dispatch(cancelStripeOnramp())
        e.stopPropagation()
      }
    },
    [stripeSessionStatus, dispatch]
  )

  useEffect(() => {
    if (isOpen && stripeClientSecret) {
      const initializeStripeSession = async () => {
        if (!STRIPE_PUBLISHABLE_KEY) {
          throw new Error('Stripe publishable key not found')
        }
        const stripeOnRampInstance = await loadStripeOnramp(
          STRIPE_PUBLISHABLE_KEY
        )
        if (!stripeOnRampInstance) {
          throw new Error('Stripe onramp instance not found')
        }
        return stripeOnRampInstance.createSession({
          clientSecret: stripeClientSecret
        })
      }
      initializeStripeSession()
        .then(setSession)
        .catch((e) => {
          console.error('Failed to initialize Stripe onramp session', e)
        })
    }
  }, [isOpen, stripeClientSecret])

  return (
    <div
      className={cn(styles.stripeModalWrapper, { [styles.visible]: isOpen })}
      style={{
        zIndex: zIndex.STRIPE_ONRAMP_MODAL_BACKGROUND
      }}
      onClick={handleBackgroundClicked}
    >
      {isOpen && session ? <MountStripeSession session={session} /> : null}
    </div>
  )
}
