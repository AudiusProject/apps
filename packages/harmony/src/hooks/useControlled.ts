/**
The MIT License (MIT)

Copyright (c) 2014 Call-Em-All

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */

import { useRef, useState, useCallback, useEffect } from 'react'

const switchControlledError = ({
  isControlled,
  stateName,
  componentName
}: {
  isControlled: boolean
  stateName: string
  componentName: string
}) => {
  return [
    `Audius Harmony: A component is changing an ${
      isControlled ? '' : 'un'
    }controlled ${stateName} state of ${componentName} to be ${
      isControlled ? 'un' : ''
    }controlled.`,
    'This is likely caused by the value changing from undefined to a defined value, which should not happen.',
    'Decide between using a controlled or uncontrolled input element for the lifetime of the component.',
    "The nature of the state is determined during the first render. It's considered controlled if the value is not `undefined`.",
    'More info: https://fb.me/react-controlled-components'
  ].join('\n')
}

const defaultChangedError = ({
  stateName,
  componentName
}: {
  stateName: string
  componentName: string
}) => {
  return (
    `Audius Harmony: A component is changing the default ${stateName} state of an uncontrolled ${componentName} after being initialized. ` +
    `To suppress this warning opt to use a controlled ${componentName}.`
  )
}

export const useControlled = <
  T extends string | number | boolean | undefined | null | readonly string[]
>({
  controlledProp,
  defaultValue,
  stateName = 'value',
  componentName
}: {
  controlledProp: T
  defaultValue: T
  stateName?: string
  componentName: string
}): [T, (newValue: T) => void] => {
  const { current: isControlled } = useRef(controlledProp !== undefined)

  const [valueState, setValueState] = useState(defaultValue)

  const value = isControlled ? controlledProp : valueState

  const setValueIfUncontrolled = useCallback(
    (newValue: T) => {
      if (!isControlled) {
        setValueState(newValue)
      }
    },
    [isControlled]
  )

  /* eslint-disable react-hooks/rules-of-hooks */
  if (process.env.NODE_ENV !== 'production') {
    useEffect(() => {
      if (isControlled !== (controlledProp !== undefined)) {
        console.error(
          switchControlledError({ isControlled, stateName, componentName })
        )
      }
    }, [componentName, controlledProp, isControlled, stateName])

    const { current: initialDefaultValue } = useRef(defaultValue)
    useEffect(() => {
      if (!isControlled && defaultValue !== initialDefaultValue) {
        console.error(defaultChangedError({ stateName, componentName }))
      }
    }, [
      componentName,
      defaultValue,
      initialDefaultValue,
      isControlled,
      stateName
    ])
  }
  /* eslint-enable react-hooks/rules-of-hooks */

  return [value, setValueIfUncontrolled]
}
