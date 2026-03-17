import { useEffect, useState } from 'react'

import { identityService } from 'app/services/sdk/identity'

export const useUserEmail = (isLoggedIn: boolean): string | null => {
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn) {
      setUserEmail(null)
      return
    }
    identityService
      .getUserEmail()
      .then((email) => setUserEmail(email ?? null))
      .catch(() => setUserEmail(null))
  }, [isLoggedIn])

  return userEmail
}
