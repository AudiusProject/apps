/**
 * TS complains about these custom elements for our Tile and Text classes
 * that use generic elements. Declaring these custom elements as intrinsic
 * elements will keep TS happy.
 *
 * @see {@link https://github.com/microsoft/TypeScript/issues/4648}
 */

declare module JSX {
  interface IntrinsicElements {
    'appkit-account-button': any
    'appkit-button': any
    'appkit-connect-button': any
    'appkit-network-button': any
    'appkit-wallet-button': any
    'w3m-account-button': any
    'w3m-button': any
    'w3m-connect-button': any
    'w3m-network-button': any
  }
}
