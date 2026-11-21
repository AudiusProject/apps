import { useCurrentAccount } from './useCurrentAccount'

export const useCurrentUserId = () => {
  return useCurrentAccount({
    select: (account) => account?.userId
  })
}
