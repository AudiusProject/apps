/// <reference types="react" />
import '@emotion/react'
import type { HarmonyTheme } from './theme'

declare module '@emotion/react' {
  export interface Theme extends HarmonyTheme {}
}

// Fix for React 19 JSX types with Emotion
declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface ElementClass extends React.Component<any> {
      render(): React.ReactNode
    }
    interface ElementAttributesProperty {
      props: {}
    }
    interface ElementChildrenAttribute {
      children: {}
    }
    interface IntrinsicAttributes extends React.Attributes {}
    interface IntrinsicClassAttributes<T> extends React.ClassAttributes<T> {}
  }
}
