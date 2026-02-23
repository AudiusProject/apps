export class UninitializedEntityManagerError extends Error {
  constructor() {
    super(
      'Entity manager is uninitialized. This can happen when calling an API method that requires an API secret in the SDK configuration. Please ensure that you have initialized the SDK with the appropriate credentials for Entity Manager operations.'
    )
    this.name = 'UninitializedEntityManagerError'
  }
}
