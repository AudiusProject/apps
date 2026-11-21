import { useEffect, useRef } from 'react'

export const useRenderingTrace = (
  componentName: string,
  propsAndStates: any
) => {
  const prev = useRef(propsAndStates)

  useEffect(() => {
    const changedProps: { [key: string]: { old: any; new: any } } =
      Object.entries(propsAndStates).reduce(
        (property: any, [key, value]: [string, any]) => {
          if (prev.current[key] !== value) {
            property[key] = {
              old: prev.current[key],
              new: value
            }
          }
          return property
        },
        {}
      )

    if (Object.keys(changedProps).length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[${componentName}] changed props:`, changedProps)
    }

    prev.current = propsAndStates
  })
}
