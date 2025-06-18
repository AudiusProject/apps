import { useMemo } from 'react'

import { useAppContext } from '~/context/appContext'

import {
  AllRemoteConfigKeys,
  BooleanKeys,
  IntKeys,
  DoubleKeys,
  StringKeys,
  RemoteConfigInstance
} from '../services'

import { useHasConfigLoaded } from './helpers'
import { useRecomputeToggle } from './useFeatureFlag'

/** @deprecated Use `useRemoteVar` directly instead */
export const createUseRemoteVarHook = ({
  remoteConfigInstance,
  useHasConfigLoaded
}: {
  remoteConfigInstance: RemoteConfigInstance
  useHasConfigLoaded: () => boolean
}) => {
  function useRemoteVar(key: IntKeys): number
  function useRemoteVar(key: DoubleKeys): number
  function useRemoteVar(key: StringKeys): string
  function useRemoteVar(key: BooleanKeys): boolean
  function useRemoteVar(
    key: AllRemoteConfigKeys
  ): boolean | string | number | null {
    const configLoaded = useHasConfigLoaded()
    const shouldRecompute = useRecomputeToggle(configLoaded)

    const remoteVar = useMemo(
      () => remoteConfigInstance.getRemoteVar(key),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [key, shouldRecompute, remoteConfigInstance]
    )
    return remoteVar
  }

  return useRemoteVar
}

export type RemoteVarHook = ReturnType<typeof createUseRemoteVarHook>

/** Fetches a remote config variable with default fallback */
export function useRemoteVar(key: IntKeys): number
export function useRemoteVar(key: DoubleKeys): number
export function useRemoteVar(key: StringKeys): string
export function useRemoteVar(key: BooleanKeys): boolean
export function useRemoteVar(
  key: AllRemoteConfigKeys
): boolean | string | number | null {
  const { remoteConfig } = useAppContext()
  const configLoaded = useHasConfigLoaded()
  const shouldRecompute = useRecomputeToggle(configLoaded)

  const remoteVar = useMemo(
    () => remoteConfig.getRemoteVar(key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, shouldRecompute, remoteConfig]
  )
  return remoteVar
}
