/** Logs given input to console if we're not in a production environment. */

export const logError = (...args) => {
  if (
    process.env.VITE_ENVIRONMENT !== 'production' ||
    process.env.VITE_SHOW_ERROR_LOGS
  ) {
    console.error(args)
  }
}
