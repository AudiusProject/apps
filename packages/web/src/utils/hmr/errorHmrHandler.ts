import { closeErrorPage } from 'store/errors/actions'

export const registerErrorHmrHandler = () => {
  if (import.meta.hot) {
    import.meta.hot.on('vite:afterUpdate', () => {
      window.store.dispatch(closeErrorPage())
    })
  }
}
