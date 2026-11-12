import { useEffect, useMemo } from 'react'

import { useFormikContext } from 'formik'

import { useNavigation } from 'app/hooks/useNavigation'

export const useRevertOnCancel = (active?: boolean) => {
  const { values, setValues } = useFormikContext() ?? {}
  const navigation = useNavigation()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialValues = useMemo(() => values, [])

  useEffect(() => {
    if (!active || !initialValues) return
    // addListener returns an unsubscribe function (not the listener itself)
    return navigation.addListener('beforeRemove', ({ data }) => {
      if (data.action.type === 'POP') {
        setValues(initialValues)
      }
    })
  }, [navigation, initialValues, setValues, active])
}
