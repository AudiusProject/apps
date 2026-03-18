# @audius/eth

## 1.0.0

### Major Changes

- a744274: Release 1.0.0

  - All contracts now simply export their ABIs and addresses.
  - No viem dependency required.
  - Treeshakable.
  - Added examples and documentation.

## 0.1.0

### Minor Changes

- b7b38ba: Rewrite authentication service to be a Viem-like AudiusWalletClient instead, and restructure the ethereum contract clients to leverage Viem more effectively.

### Patch Changes

- e872cbf: Fix Wormhole Client to match typo in solidity contract (artbiter)
- aef5021: Make @audius/eth public
