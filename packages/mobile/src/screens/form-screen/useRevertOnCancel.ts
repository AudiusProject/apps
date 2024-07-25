import { useEffect, useMemo } from 'react'

import { useFormikContext } from 'formik'

import { useNavigation } from 'app/hooks/useNavigation'

export const useRevertOnCancel = (active?: boolean) => {
  const { values, setValues } = useFormikContext()
  const navigation = useNavigation()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialValues = useMemo(() => values, [])

  useEffect(() => {
    if (!active) return
    const listener = navigation.addListener('beforeRemove', ({ data }) => {
      if (data.action.type === 'POP') {
        setValues(initialValues)
      }
    })

    return () => {
      navigation.removeListener('beforeRemove', listener)
    }
  }, [navigation, initialValues, setValues, active])
}
