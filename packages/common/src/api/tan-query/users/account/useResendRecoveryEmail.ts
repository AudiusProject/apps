import { useMutation } from '@tanstack/react-query'

import { useAppContext } from '~/context/appContext'
import { Name } from '~/models/Analytics'

import { useQueryContext } from '../../utils'

/**
 * Sends a recovery info email to the currently logged-in user. Replaces the
 * legacy `recoveryEmailActions.resendRecoveryEmail` saga in
 * packages/web/src/common/store/recovery-email/sagas.ts.
 */
export const useResendRecoveryEmail = () => {
  const { authService, identityService, analytics } = useQueryContext()
  const { getHostUrl } = useAppContext()

  return useMutation({
    mutationFn: async () => {
      const recoveryInfo =
        await authService.hedgehogInstance.generateRecoveryInfo()
      const host = getHostUrl() ?? recoveryInfo.host
      await identityService.sendRecoveryInfo({
        login: recoveryInfo.login,
        host
      })
    },
    onSuccess: () => {
      analytics.track(
        analytics.make({
          eventName: Name.SETTINGS_RESEND_ACCOUNT_RECOVERY
        })
      )
    },
    onError: (error) => {
      console.error(
        'Resend Recovery: Failed to send recovery email',
        error instanceof Error ? error : new Error(String(error))
      )
    }
  })
}
