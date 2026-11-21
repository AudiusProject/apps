const unavailable = (name: string) => () => {
  throw new Error(`react-router ${name} is not available on mobile`)
}

export const matchPath = unavailable('matchPath')
export const useLocation = unavailable('useLocation')
