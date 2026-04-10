export class HedgehogWalletNotFoundError extends Error {
  constructor() {
    super('Hedgehog wallet not found. Is the user logged in?')
  }
}
