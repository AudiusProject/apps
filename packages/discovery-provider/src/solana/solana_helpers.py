import base58
from solders.pubkey import Pubkey


# Retrieve the base public key and derived public key for claimable token acct
def get_address_pair(mint, hashed_eth_pk, program_id, spl_token_id):
    base_pk, base_seed = get_base_address(mint, program_id)
    derived_pk, derive_seed = get_derived_address(base_pk, hashed_eth_pk, spl_token_id)
    return [(base_pk, base_seed), (derived_pk, derive_seed)]


# Query the base program address based on mint + program_id
# Used in subsequent derivation
def get_base_address(mint, program_id):
    return Pubkey.find_program_address([bytes(mint)], program_id)


# Create a known address based on ethereum public key
def get_derived_address(base, hashed_eth_pk, spl_token_id):
    seed = base58.b58encode(hashed_eth_pk).decode()
    return Pubkey.create_with_seed(base, seed, spl_token_id), seed


# Static SPL Token Program ID
# NOTE: This is static and will not change
SPL_TOKEN_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
SPL_TOKEN_ID_PK = Pubkey.from_string(SPL_TOKEN_ID)

# Static SPL Associated Token Program ID
# NOTE: This is static and will not change
ASSOCIATED_TOKEN_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
ASSOCIATED_TOKEN_PROGRAM_ID_PK = Pubkey.from_string(ASSOCIATED_TOKEN_PROGRAM_ID)


# Static Memo Program ID
MEMO_PROGRAM_ID = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo"

# Static Memo Program ID
MEMO_V2_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"

# Static Jupiter Swap Program ID
JUPITER_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
