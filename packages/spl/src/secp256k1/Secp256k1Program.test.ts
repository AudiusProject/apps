import { describe, it, expect } from 'vitest'

import { Secp256k1Program } from './Secp256k1Program'

describe('Secp256k1Program', () => {
  it('returns true when signature is valid and matches instruction', () => {
    const validSignature =
      '012000000c000061004500008fcfa10bd3808570987dbb5b1ef4ab74400fbfdaf89b2e6f97f95f1306b468b10b1a18df9569b07d9d7b81b241d6fc99d9ec782e4e449f5c3c63836ed52c9344d3de5c3133fead711e421af545822f09bd78cb390068d5397bb16195ea47091010f3abb8fc6b5cdfa65f00e1f505000000005f623a33383639383d3e3530373431303135335f00b6462e955da5841b6d9e1e2529b830f00f31bf'
    expect(
      Secp256k1Program.verifySignature(
        Secp256k1Program.decode(Buffer.from(validSignature, 'hex'))
      )
    )
  })

  it('throws when the signature recovery is off the curve', () => {
    const invalidSignature =
      '012000000c0000610030000000b6462e955da5841b6d9e1e2529b830f00f31bf00d405b277dc948f97d7b7db8648cb16590d66084ba49642fedb08380ce5027a95d0a895287a3331332e7ad13daba87eed5c70820a19ca2eb6cc0ea1eb4695ba0081729dc83c157f41de7df4b72fc7e90d8d64d5aa5f00e1f505000000005f72656665727265643a353339343735333137'
    expect(() =>
      Secp256k1Program.verifySignature(
        Secp256k1Program.decode(Buffer.from(invalidSignature, 'hex'))
      )
    ).toThrow()
  })
})
