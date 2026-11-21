export const logError = (...args) => {
  if (
    process.env.VITE_ENVIRONMENT !== 'production' ||
    process.env.VITE_SHOW_ERROR_LOGS
  ) {
    console.error(args)
  }
}
