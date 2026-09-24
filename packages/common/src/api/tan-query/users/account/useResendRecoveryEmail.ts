import { useMutation } from '@tanstack/react-query'

import { useAppContext } from '~/context/appContext'

import { useQueryContext } from '../../utils'

/**
 * Sends a recovery info email to the currently logged-in user. Replaces the
 * legacy `recoveryEmailActions.resendRecoveryEmail` saga in
 * packages/web/src/common/store/recovery-email/sagas.ts.
 */
export const useResendRecoveryEmail = () => {
  const { authService, identityService } = useQueryContext()
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
    onError: (error) => {
      console.error(
        'Resend Recovery: Failed to send recovery email',
        error instanceof Error ? error : new Error(String(error))
      )
    }
  })
}
