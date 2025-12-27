/**
 * Default CSS definition for typescript,
 * will be overridden with file-specific definitions by rollup
 */
declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}

declare module '*.svg' {
  type IconComponent = import('./components/icon').IconComponent
  const iconComponent: IconComponent
  export default iconComponent
}

declare module '*.png'
declare module '*.jpg'
declare module '*.jpeg'
