import { Id } from '@audius/sdk'
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryFunctionContext
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import {
  useQueryContext,
  type QueryContextType
} from '~/api/tan-query/utils/QueryContext'
import { walletMessages } from '~/messages'
import { Chain, type ID } from '~/models'
import { profilePageActions } from '~/store/pages'
import { toast } from '~/store/ui/toast/slice'

import { QUERY_KEYS } from '../queryKeys'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

export type ConnectedWallet = {
  address: string
  chain: Chain
  isPending?: boolean
}

type ConnectedWalletsParams = {
  userId: ID | null | undefined
}

const getConnectedWalletsQueryKey = ({ userId }: ConnectedWalletsParams) =>
  [QUERY_KEYS.connectedWallets, userId] as const

type FetchConnectedWalletsContext = Pick<QueryContextType, 'audiusSdk'>

const getConnectedWalletsQueryFn =
  (context: FetchConnectedWalletsContext) =>
  async (
    queryContext: QueryFunctionContext<
      ReturnType<typeof getConnectedWalletsQueryKey>
    >
  ) => {
    const [, currentUserId] = queryContext.queryKey
    const sdk = await context.audiusSdk()
    const { data } = await sdk.users.getConnectedWallets({
      id: Id.parse(currentUserId)
    })
    return data?.ercWallets
      ?.map<ConnectedWallet>((address) => ({
        address,
        chain: Chain.Eth
      }))
      .concat(
        data?.splWallets?.map((address) => ({
          address,
          chain: Chain.Sol
        }))
      )
  }

export const getConnectedWalletsQueryOptions = (
  context: FetchConnectedWalletsContext,
  params: ConnectedWalletsParams
) => {
  return queryOptions({
    queryKey: getConnectedWalletsQueryKey(params),
    queryFn: getConnectedWalletsQueryFn(context)
  })
}

export const useConnectedWallets = (
  options?: Partial<ReturnType<typeof getConnectedWalletsQueryOptions>>
) => {
  const context = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    ...options,
    enabled: options?.enabled !== false && !!currentUserId,
    ...getConnectedWalletsQueryOptions(context, { userId: currentUserId })
  })
}

type AddConnectedWalletParams = {
  wallet: ConnectedWallet
  signature: string
}

export const useAddConnectedWallet = () => {
  const queryClient = useQueryClient()
  const { audiusSdk, reportToSentry } = useQueryContext()
  const { data: currentUserId = null } = useCurrentUserId()

  // for priming cache
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: async ({ wallet, signature }: AddConnectedWalletParams) => {
      if (!currentUserId) {
        throw new Error('Cannot add connected wallet: user not logged in')
      }
      const sdk = await audiusSdk()
      await sdk.users.addAssociatedWallet({
        userId: Id.parse(currentUserId),
        wallet,
        signature
      })
    },
    onMutate: async (params) => {
      // Cache old state
      const previousAssociatedWallets = queryClient.getQueryData<
        ConnectedWallet[]
      >(getConnectedWalletsQueryKey({ userId: currentUserId }))

      if (!previousAssociatedWallets) {
        return { previousAssociatedWallets: [] }
      }

      // Optimistically add the new wallet
      const options = getConnectedWalletsQueryOptions(
        { audiusSdk },
        { userId: currentUserId }
      )
      queryClient.setQueryData(options.queryKey, (old) => [
        ...(old ?? []),
        { ...params.wallet, isPending: true }
      ])
      return { previousAssociatedWallets }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: getConnectedWalletsQueryKey({ userId: currentUserId })
      })

      // Temporarily manually refetch relevant redux states
      dispatch(
        profilePageActions.fetchProfile(
          null,
          currentUserId,
          false,
          false,
          false
        )
      )
    },
    onError: (error, _newWallet, context) => {
      queryClient.setQueryData(
        getConnectedWalletsQueryKey({ userId: currentUserId }),
        context?.previousAssociatedWallets
      )
      reportToSentry({
        error,
        name: 'Add Connected Wallet'
      })
    }
  })
}

export type RemoveConnectedWalletParams = {
  wallet: { address: string; chain: Chain }
}

export const useRemoveConnectedWallet = () => {
  const queryClient = useQueryClient()
  const { audiusSdk, reportToSentry } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  // for priming cache
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: async ({ wallet }: RemoveConnectedWalletParams) => {
      if (!currentUserId) {
        throw new Error('Cannot remove connected wallet: user not logged in')
      }
      const sdk = await audiusSdk()
      const response = await sdk.users.removeAssociatedWallet({
        userId: Id.parse(currentUserId),
        wallet
      })
      return response
    },
    onSuccess: () => {
      dispatch(
        toast({
          content: walletMessages.linkedWallets.toasts.walletRemoved,
          type: 'info'
        })
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getConnectedWalletsQueryKey({ userId: currentUserId })
      })
      // Invalidate user coin query to update balances
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.userCoin, currentUserId]
      })

      // Temporarily manually refetch relevant redux states
      dispatch(
        profilePageActions.fetchProfile(
          null,
          currentUserId,
          false,
          false,
          false
        )
      )
    },
    onError: (error) => {
      dispatch(
        toast({
          content: walletMessages.linkedWallets.toasts.error,
          type: 'error'
        })
      )
      reportToSentry({
        error,
        name: 'Remove Connected Wallet'
      })
    }
  })
}
