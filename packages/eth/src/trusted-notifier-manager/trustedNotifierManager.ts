import { abi } from './abi'

/**
 * Registry of trusted notifier entities, each identified by a unique ID with
 * wallet, endpoint, and email fields. Only governance can register or
 * deregister notifiers.
 */
export const TrustedNotifierManager = {
  abi,
  address: '0x6f08105c8CEef2BC5653640fcdbBE1e7bb519D39' as const
}
