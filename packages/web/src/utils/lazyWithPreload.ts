import { lazy, ComponentType, LazyExoticComponent } from 'react'

type PreloadFactory<T extends ComponentType<any>> = () => Promise<{
  default: T
}>

type PreloadableLazyComponent<T extends ComponentType<any>> =
  LazyExoticComponent<T> & {
    preload: () => Promise<{ default: T }>
  }

export default function lazyWithPreload<T extends ComponentType<any>>(
  factory: PreloadFactory<T>,
  delay?: number
) {
  const LazyComponent = lazy(factory)
  const Component = LazyComponent as PreloadableLazyComponent<T>
  Component.preload = factory
  if (delay !== undefined) {
    setTimeout(() => Component.preload(), delay)
  }
  return Component
}
