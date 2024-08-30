import json

from solders.rpc.responses import GetTransactionResp

# Notes about the transactions below to make things easier:
# - accountKeys[1] is the sender account
# - accountKeys[3] is the recipient account.
# - The "data" field in the memo transaction is a base58 encoded string consisting of either
#   * <content_type>:<content_id>:<block_number_at_time_of_transaction>
#   * <content_type>:<content_id>:<block_number_at_time_of_transaction>:<purchaser_user_id>
# - `meta.preTokenBalances` and `meta.postTokenBalances` determine the amount transferred.
# The negative balance change in the "sending" account should match the sum of
# the positive balance changes in the "receiving" accounts. These can be modified
# to create new transactions with different value amounts. "Pay extra" is just a case
# where the total amount sent to the recipients is greater than the content price (
# defined by tracks using the TrackPriceHistory table, for example).
# New test cases that only need to differ in amounts and memo transaction metadata can
# be created by copying and modifying a transaction below. If you need to work with more
# than one transaction at a time in a test, you may need to change the signature.


MOCK_SIGNATURE = "3tD61jrsU4b6s7jMGR3hg7p9Dsm88NRR2RVgUUjdcHqfFf9JWRwyhPiRGvEqHnLN6qaoc1Gvqy9Nv2UyKcWe6u4C"

FEE_PAYER = "HmqRrgrZjR1Fkwgbv1nDXuUYQYs6ocGSzmGPoEUZqK1X"
USDC_MINT = "26Q7gP8UfkDzi7GMFEQxTJaNJ8D2ybCUjex58M5MLu8y"
WAUDIO_MINT = "37RCjhgV1qGV2Q54EHFScdxZ22ydRMdKMtVgod47fDP3"

CLAIMABLE_TOKENS_PDA = "testHKV1B56fbvop4w6f2cTGEub9dRQ2Euta5VmqdX9"
UNKNOWN_PDA = "2HYsaffLbtDuMNNiUkvnQ1i9bHdMwtzEfB4win2bHkaj"

# Used as sender / purchaser in tracks below
SENDER_USDC_USER_BANK_ADDRESS = "38YSndmPWVF3UdzczbB3UMYUgPQtZrgvvPVHa3M4yQVX"
SENDER_ROOT_WALLET_USDC_ACCOUNT = "3XmVeZ6M1FYDdUQaNeQZf8dipvtzNP6NVb5xjDkdeiNb"
SENDER_ROOT_WALLET_USDC_ACCOUNT_OWNER = "HXLN9UWwAjMPgHaFZDfgabT79SmLSdTeu2fUha2xHz9W"
# Used as recipient / track owner in transactions below
RECIPIENT_USDC_USER_BANK_ADDRESS = "7G1angvMtUZLFMyrMDGj7bxsduB4bjLD7VXRR7N4FXqe"
SENDER_ACCOUNT_WAUDIO_ADDRESS = "9yqbTsyhgH6XFxZXVWKC3mEoxFnToodWiDgyx3YWZbL"
RECEIVER_ACCOUNT_WAUDIO_ADDRESS = "ECohA2z8a9VGbicoFU7aJGt7ENRsJcsrnfnyG5e4qYkp"
EXTERNAL_ACCOUNT_ADDRESS = "7hxqJmiPkSAP1zbtu8w2gWXUzEvNp8u9Ms5pKcKwXiNn"
EXTERNAL_ACCOUNT_ADDRESS_OWNER = "8HLdEuB5K4TGa8txZQpjZcsgYf4PNdnft1ZeZobhP4Ug"
NONCE_ACCOUNT_ADDRESS = "ETHqyvd51HyoKtsgVdZTVH7c7Qw6dS6zpthqfGPtUsWk"

# The PDA accounts which own user banks in the transactions below need to be owned
# by the CLAIMABLE_TOKENS_PDA account. The addresses are derived using the PDA and
# mint addresses as input.

# Pubkey.find_program_address([bytes(WAUDIO_MINT)], Pubkey.from_string(CLAIMABLE_TOKENS_PDA))
WAUDIO_PDA = "8GrLc33SYDHaVKoXRLMau2yjYnMnSVg179qwJp9izeQb"


# Pubkey.find_program_address([bytes(USDC_MINT)], Pubkey.from_string(CLAIMABLE_TOKENS_PDA))
USDC_PDA = "7vKR1WSmyHvBmCvKPZBiN66PHZqYQbXw51SZdwtVd9Dt"

# contentType:contentId:blockNumber:purchaseUserId:accessType
# (backwards compatibility to old 3 or 4 field format)
# base58.b58encode("track:1:10").decode("utf-8")
PURCHASE_TRACK1_MEMO_DATA = "7YSwHDhdZsHu6X"

# base58.b58encode("Prepare Withdrawal").decode("utf-8")
PREPARE_WITHDRAWAL_MEMO = "4LXeTxmZydvvx9jk2DnmBAwcX"
# base58.b58encode("Withdrawal").decode("utf-8")
WITHDRAWAL_MEMO = "5uqUSXZpY6AMST"

# Transfer $1 USDC between two user banks without a purchase
mock_valid_transfer_without_purchase_tx = GetTransactionResp.from_json(
    json.dumps(
        {
            "jsonrpc": "2.0",
            "result": {
                "slot": 227246439,
                "transaction": {
                    "signatures": [MOCK_SIGNATURE],
                    "message": {
                        "header": {
                            "numRequiredSignatures": 1,
                            "numReadonlySignedAccounts": 0,
                            "numReadonlyUnsignedAccounts": 8,
                        },
                        "accountKeys": [
                            FEE_PAYER,
                            SENDER_USDC_USER_BANK_ADDRESS,
                            NONCE_ACCOUNT_ADDRESS,
                            RECIPIENT_USDC_USER_BANK_ADDRESS,
                            "11111111111111111111111111111111",
                            CLAIMABLE_TOKENS_PDA,
                            USDC_PDA,
                            "KeccakSecp256k11111111111111111111111111111",
                            "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo",
                            "Sysvar1nstructions1111111111111111111111111",
                            "SysvarRent111111111111111111111111111111111",
                            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        ],
                        "recentBlockhash": "5H434VMiHgK7RaJZaBKKcriu4eky8erb9QGfcHJSZquU",
                        "instructions": [
                            {
                                "programIdIndex": 7,
                                "accounts": [],
                                "data": "H4eCheRWTZDTCFYUcyMzE6EhQMZvvvLKJ9g6YaUpbZeoLLgVj1uvwCTdzcb2MzbKHsRjN8DjLYdqxuQEZe2TjUKCuBMrFtpnnLd4RcvBnr4ieHCdH8ZU1N6XDfiqyKB4zenQ9S4viza4ob4gbtmiRS6o6KGEtL3fJQRvaA3tdtSx1rfFogZzwMXAxHrkuxHrpAqfm",
                                "stackHeight": None,
                            },
                            {
                                "programIdIndex": 5,
                                "accounts": [0, 1, 3, 2, 6, 10, 9, 4, 11],
                                "data": "6dMrrkPeSzw2r5huQ6RToaJCaVuu",
                                "stackHeight": None,
                            },
                        ],
                    },
                },
                "meta": {
                    "err": None,
                    "status": {"Ok": None},
                    "fee": 10000,
                    "preBalances": [
                        1689358166,
                        2039280,
                        953520,
                        2039280,
                        1,
                        1141440,
                        0,
                        1,
                        121159680,
                        0,
                        1009200,
                        934087680,
                    ],
                    "postBalances": [
                        1689348166,
                        2039280,
                        953520,
                        2039280,
                        1,
                        1141440,
                        0,
                        1,
                        121159680,
                        0,
                        1009200,
                        934087680,
                    ],
                    "innerInstructions": [
                        {
                            "index": 1,
                            "instructions": [
                                {
                                    "programIdIndex": 11,
                                    "accounts": [1, 3, 6, 6],
                                    "data": "3mhiKuxuaKy1",
                                    "stackHeight": 2,
                                }
                            ],
                        }
                    ],
                    "logMessages": [
                        f"Program {CLAIMABLE_TOKENS_PDA} invoke [1]",
                        "Program log: Instruction: Transfer",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
                        "Program log: Instruction: Transfer",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4728 of 581084 compute units",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
                        f"Program {CLAIMABLE_TOKENS_PDA} consumed 24149 of 600000 compute units",
                        f"Program {CLAIMABLE_TOKENS_PDA} success",
                    ],
                    "preTokenBalances": [
                        {
                            "accountIndex": 1,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": 1.0,
                                "decimals": 6,
                                "amount": "1000000",
                                "uiAmountString": "1",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 3,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": None,
                                "decimals": 6,
                                "amount": "0",
                                "uiAmountString": "0",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "postTokenBalances": [
                        {
                            "accountIndex": 1,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": None,
                                "decimals": 6,
                                "amount": "0",
                                "uiAmountString": "0",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 3,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": 1.0,
                                "decimals": 6,
                                "amount": "1000000",
                                "uiAmountString": "1",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "rewards": [],
                    "loadedAddresses": {"writable": [], "readonly": []},
                    "computeUnitsConsumed": 24737,
                },
                "blockTime": 1698802811,
            },
            "id": 0,
        }
    )
)


# Transfer $1 to a non user bank account as preparation for withdrawal
mock_valid_transfer_prepare_withdrawal_tx = GetTransactionResp.from_json(
    json.dumps(
        {
            "jsonrpc": "2.0",
            "result": {
                "slot": 227246439,
                "transaction": {
                    "signatures": [MOCK_SIGNATURE],
                    "message": {
                        "header": {
                            "numRequiredSignatures": 1,
                            "numReadonlySignedAccounts": 0,
                            "numReadonlyUnsignedAccounts": 8,
                        },
                        "accountKeys": [
                            FEE_PAYER,
                            SENDER_USDC_USER_BANK_ADDRESS,
                            NONCE_ACCOUNT_ADDRESS,
                            SENDER_ROOT_WALLET_USDC_ACCOUNT_OWNER,
                            "11111111111111111111111111111111",
                            CLAIMABLE_TOKENS_PDA,
                            USDC_PDA,
                            "KeccakSecp256k11111111111111111111111111111",
                            "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo",
                            "Sysvar1nstructions1111111111111111111111111",
                            "SysvarRent111111111111111111111111111111111",
                            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        ],
                        "recentBlockhash": "5H434VMiHgK7RaJZaBKKcriu4eky8erb9QGfcHJSZquU",
                        "instructions": [
                            {
                                "programIdIndex": 7,
                                "accounts": [],
                                "data": "H4eCheRWTZDTCFYUcyMzE6EhQMZvvvLKJ9g6YaUpbZeoLLgVj1uvwCTdzcb2MzbKHsRjN8DjLYdqxuQEZe2TjUKCuBMrFtpnnLd4RcvBnr4ieHCdH8ZU1N6XDfiqyKB4zenQ9S4viza4ob4gbtmiRS6o6KGEtL3fJQRvaA3tdtSx1rfFogZzwMXAxHrkuxHrpAqfm",
                                "stackHeight": None,
                            },
                            {
                                "programIdIndex": 5,
                                "accounts": [0, 1, 3, 2, 6, 10, 9, 4, 11],
                                "data": "6dMrrkPeSzw2r5huQ6RToaJCaVuu",
                                "stackHeight": None,
                            },
                            {
                                "programIdIndex": 8,
                                "accounts": [0],
                                "data": PREPARE_WITHDRAWAL_MEMO,
                                "stackHeight": None,
                            },
                        ],
                    },
                },
                "meta": {
                    "err": None,
                    "status": {"Ok": None},
                    "fee": 10000,
                    "preBalances": [
                        1689358166,
                        2039280,
                        953520,
                        2039280,
                        1,
                        1141440,
                        0,
                        1,
                        121159680,
                        0,
                        1009200,
                        934087680,
                    ],
                    "postBalances": [
                        1689348166,
                        2039280,
                        953520,
                        2039280,
                        1,
                        1141440,
                        0,
                        1,
                        121159680,
                        0,
                        1009200,
                        934087680,
                    ],
                    "innerInstructions": [
                        {
                            "index": 1,
                            "instructions": [
                                {
                                    "programIdIndex": 11,
                                    "accounts": [1, 3, 6, 6],
                                    "data": "3mhiKuxuaKy1",
                                    "stackHeight": 2,
                                }
                            ],
                        }
                    ],
                    "logMessages": [
                        f"Program {CLAIMABLE_TOKENS_PDA} invoke [1]",
                        "Program log: Instruction: Transfer",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
                        "Program log: Instruction: Transfer",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4728 of 581084 compute units",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
                        f"Program {CLAIMABLE_TOKENS_PDA} consumed 24149 of 600000 compute units",
                        f"Program {CLAIMABLE_TOKENS_PDA} success",
                        "Program Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo invoke [1]",
                        "Program Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo consumed 588 of 575851 compute units",
                        "Program Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo success",
                    ],
                    "preTokenBalances": [
                        {
                            "accountIndex": 1,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": 1.0,
                                "decimals": 6,
                                "amount": "1000000",
                                "uiAmountString": "1",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 3,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": None,
                                "decimals": 6,
                                "amount": "0",
                                "uiAmountString": "0",
                            },
                            "owner": SENDER_ROOT_WALLET_USDC_ACCOUNT_OWNER,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "postTokenBalances": [
                        {
                            "accountIndex": 1,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": None,
                                "decimals": 6,
                                "amount": "0",
                                "uiAmountString": "0",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 3,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": 1.0,
                                "decimals": 6,
                                "amount": "1000000",
                                "uiAmountString": "1",
                            },
                            "owner": SENDER_ROOT_WALLET_USDC_ACCOUNT_OWNER,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "rewards": [],
                    "loadedAddresses": {"writable": [], "readonly": []},
                    "computeUnitsConsumed": 24737,
                },
                "blockTime": 1698802811,
            },
            "id": 0,
        }
    )
)


# Transfer $1 to a user bank and then out to an external address with a withdrawal memo
# Flow is root wallet usdc acct -> user bank -> external address
mock_valid_transfer_withdrawal_tx = GetTransactionResp.from_json(
    json.dumps(
        {
            "jsonrpc": "2.0",
            "result": {
                "slot": 245096140,
                "transaction": {
                    "signatures": [MOCK_SIGNATURE],
                    "message": {
                        "header": {
                            "numRequiredSignatures": 1,
                            "numReadonlySignedAccounts": 0,
                            "numReadonlyUnsignedAccounts": 9,
                        },
                        "accountKeys": [
                            FEE_PAYER,
                            "3nmLmEzwBBjERiV9UU1a4JXzESwDjrKZdSjP1KG4M9Mc",  # Destination
                            SENDER_USDC_USER_BANK_ADDRESS,  # User Bank Sender
                            NONCE_ACCOUNT_ADDRESS,  # Nonce
                            SENDER_ROOT_WALLET_USDC_ACCOUNT,  # Root wallet usdc account
                            "11111111111111111111111111111111",
                            USDC_MINT,
                            CLAIMABLE_TOKENS_PDA,
                            USDC_PDA,
                            "KeccakSecp256k11111111111111111111111111111",
                            "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo",
                            "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
                            "Sysvar1nstructions1111111111111111111111111",
                            "SysvarRent111111111111111111111111111111111",
                            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        ],
                        "recentBlockhash": "B1jNkfQheX2m3NosedANVueUCw9sekihw5KNAYACwKWg",
                        "instructions": [
                            {
                                "programIdIndex": 13,
                                "accounts": [4, 6, 2, 0],
                                "data": "gvPShZQhKrzGM",
                                "stackHeight": None,
                            },
                            {
                                "programIdIndex": 9,
                                "accounts": [],
                                "data": "H4eCsH1NV1T5Rrwb1xTxXJaqbsXvM53nh9nFhr4guwnTgJUjzbiPWBg4vTg44xzSgQCs1uEz1MYyFnynuyWtVKqMyUUvTNMU3giPhXtdfJLMrPhtaPz1sYN6qcd7YGwyk6cMvEZPPjGjMceYxumjPN4aYeFsrazCisbpp8FYiN4bVsV1HV5BkEqfH1wgDaezzBmFd",
                                "stackHeight": None,
                            },
                            {
                                "programIdIndex": 7,
                                "accounts": [0, 2, 1, 3, 8, 13, 12, 5, 14],
                                "data": "6dMrrkPeSzw2r5huQ6RToaJCaVuu",
                                "stackHeight": None,
                            },
                            {
                                "programIdIndex": 10,
                                "accounts": [0],
                                "data": WITHDRAWAL_MEMO,
                                "stackHeight": None,
                            },
                            {
                                "programIdIndex": 11,
                                "accounts": [0],
                                "data": "4sHBbAWcJZWyJ5TcmKVbb1xNF1kEk9KKgfjJ1pB8aiYY6b3jYCg3NRpegK2XUEdUdtZtEhiT9sxDTanxBg7QNo74XiqnQ6rmtsSP8Ky42NQ9oZQbMhptMz5hmVxzEfYUYFyQCDToEjfQT2daE3CtsXSdgt3BnmZnpck",
                                "stackHeight": None,
                            },
                        ],
                    },
                },
                "meta": {
                    "err": None,
                    "status": {"Ok": None},
                    "fee": 10000,
                    "preBalances": [
                        49083651,
                        2039280,
                        2039280,
                        953520,
                        2039280,
                        1,
                        227469696505,
                        1141440,
                        0,
                        1,
                        521498880,
                        521498880,
                        0,
                        1009200,
                        934087680,
                    ],
                    "postBalances": [
                        49073651,
                        2039280,
                        2039280,
                        953520,
                        2039280,
                        1,
                        227469696505,
                        1141440,
                        0,
                        1,
                        521498880,
                        521498880,
                        0,
                        1009200,
                        934087680,
                    ],
                    "innerInstructions": [
                        {
                            "index": 2,
                            "instructions": [
                                {
                                    "programIdIndex": 14,
                                    "accounts": [2, 1, 8, 8],
                                    "data": "3QCwqmHZ4mdq",
                                    "stackHeight": 2,
                                }
                            ],
                        }
                    ],
                    "logMessages": [
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
                        "Program log: Instruction: TransferChecked",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 6199 of 800000 compute units",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
                        f"Program {CLAIMABLE_TOKENS_PDA} invoke [1]",
                        "Program log: Instruction: Transfer",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
                        "Program log: Instruction: Transfer",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4728 of 774885 compute units",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
                        f"Program {CLAIMABLE_TOKENS_PDA} consumed 24149 of 793801 compute units",
                        f"Program {CLAIMABLE_TOKENS_PDA} success",
                        "Program Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo invoke [1]",
                        "Program Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo consumed 588 of 575851 compute units",
                        "Program Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo success",
                        "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr invoke [1]",
                        "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr consumed 56953 of 769652 compute units",
                        "Program MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr success",
                    ],
                    "preTokenBalances": [
                        {
                            "accountIndex": 1,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": None,
                                "decimals": 6,
                                "amount": "0",
                                "uiAmountString": "0",
                            },
                            "owner": "41zCUJsKk6cMB94DDtm99qWmyMZfp4GkAhhuz4xTwePu",
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 2,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": 12.61479,
                                "decimals": 6,
                                "amount": "12614790",
                                "uiAmountString": "12.61479",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 4,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": 1.0,
                                "decimals": 6,
                                "amount": "1000000",
                                "uiAmountString": "1",
                            },
                            "owner": SENDER_ROOT_WALLET_USDC_ACCOUNT_OWNER,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "postTokenBalances": [
                        {
                            "accountIndex": 1,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": 1.0,
                                "decimals": 6,
                                "amount": "1000000",
                                "uiAmountString": "1",
                            },
                            "owner": "41zCUJsKk6cMB94DDtm99qWmyMZfp4GkAhhuz4xTwePu",
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 2,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": 12.61479,
                                "decimals": 6,
                                "amount": "12614790",
                                "uiAmountString": "12.61479",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 4,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": None,
                                "decimals": 6,
                                "amount": "0",
                                "uiAmountString": "0",
                            },
                            "owner": "61DEuBcQzLWLgsr8F8XqJo5NeULfdTdVThKiYz4AtdB7",
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "rewards": [],
                    "loadedAddresses": {"writable": [], "readonly": []},
                    "computeUnitsConsumed": 87301,
                },
                "blockTime": 1706633649,
            },
            "id": 0,
        }
    )
)

# Mock purchase that fails with an instruction error.
# Used to make sure that indexing can handle errors gracefully.
mock_failed_track_purchase_tx = GetTransactionResp.from_json(
    json.dumps(
        {
            "jsonrpc": "2.0",
            "result": {
                "slot": 227246439,
                "transaction": {
                    "signatures": [MOCK_SIGNATURE],
                    "message": {
                        "header": {
                            "numRequiredSignatures": 1,
                            "numReadonlySignedAccounts": 0,
                            "numReadonlyUnsignedAccounts": 8,
                        },
                        "accountKeys": [
                            FEE_PAYER,
                            SENDER_USDC_USER_BANK_ADDRESS,
                            NONCE_ACCOUNT_ADDRESS,
                            RECIPIENT_USDC_USER_BANK_ADDRESS,
                            "11111111111111111111111111111111",
                            CLAIMABLE_TOKENS_PDA,
                            USDC_PDA,
                            "KeccakSecp256k11111111111111111111111111111",
                            "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo",
                            "Sysvar1nstructions1111111111111111111111111",
                            "SysvarRent111111111111111111111111111111111",
                            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        ],
                        "recentBlockhash": "5H434VMiHgK7RaJZaBKKcriu4eky8erb9QGfcHJSZquU",
                        "instructions": [
                            {
                                "programIdIndex": 7,
                                "accounts": [],
                                "data": "H4eCheRWTZDTCFYUcyMzE6EhQMZvvvLKJ9g6YaUpbZeoLLgVj1uvwCTdzcb2MzbKHsRjN8DjLYdqxuQEZe2TjUKCuBMrFtpnnLd4RcvBnr4ieHCdH8ZU1N6XDfiqyKB4zenQ9S4viza4ob4gbtmiRS6o6KGEtL3fJQRvaA3tdtSx1rfFogZzwMXAxHrkuxHrpAqfm",
                                "stackHeight": None,
                            },
                            {
                                "programIdIndex": 5,
                                "accounts": [0, 1, 3, 2, 6, 10, 9, 4, 11],
                                "data": "6dMrrkPeSzw2r5huQ6RToaJCaVuu",
                                "stackHeight": None,
                            },
                            {
                                "programIdIndex": 8,
                                "accounts": [0],
                                "data": PURCHASE_TRACK1_MEMO_DATA,
                                "stackHeight": None,
                            },
                        ],
                    },
                },
                "meta": {
                    "err": {"InstructionError": [0, {"Custom": 1}]},
                    "status": {"Err": {"InstructionError": [0, {"Custom": 1}]}},
                    "fee": 10000,
                    "preBalances": [
                        1689358166,
                        2039280,
                        953520,
                        2039280,
                        1,
                        1141440,
                        0,
                        1,
                        121159680,
                        0,
                        1009200,
                        934087680,
                    ],
                    "postBalances": [
                        1689348166,
                        2039280,
                        953520,
                        2039280,
                        1,
                        1141440,
                        0,
                        1,
                        121159680,
                        0,
                        1009200,
                        934087680,
                    ],
                    "innerInstructions": [
                        {
                            "index": 1,
                            "instructions": [
                                {
                                    "programIdIndex": 11,
                                    "accounts": [1, 3, 6, 6],
                                    "data": "3mhiKuxuaKy1",
                                    "stackHeight": 2,
                                }
                            ],
                        }
                    ],
                    "logMessages": [
                        f"Program {CLAIMABLE_TOKENS_PDA} invoke [1]",
                        "Program log: Instruction: Transfer",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
                        "Program log: Instruction: Transfer",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4728 of 581084 compute units",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
                        f"Program {CLAIMABLE_TOKENS_PDA} consumed 24149 of 600000 compute units",
                        f"Program {CLAIMABLE_TOKENS_PDA} success",
                        "Program Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo invoke [1]",
                        "Program Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo consumed 588 of 575851 compute units",
                        "Program Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo success",
                    ],
                    "preTokenBalances": [
                        {
                            "accountIndex": 1,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": 1.0,
                                "decimals": 6,
                                "amount": "1000000",
                                "uiAmountString": "1",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 3,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": None,
                                "decimals": 6,
                                "amount": "0",
                                "uiAmountString": "0",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "postTokenBalances": [
                        {
                            "accountIndex": 1,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": None,
                                "decimals": 6,
                                "amount": "0",
                                "uiAmountString": "0",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 3,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": 1.0,
                                "decimals": 6,
                                "amount": "1000000",
                                "uiAmountString": "1",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "rewards": [],
                    "loadedAddresses": {"writable": [], "readonly": []},
                    "computeUnitsConsumed": 24737,
                },
                "blockTime": 1698802811,
            },
            "id": 0,
        }
    )
)


# Create token account for userbank address 7G1angvMtUZLFMyrMDGj7bxsduB4bjLD7VXRR7N4FXqe
# and eth address 0xe66402f9a6714a874a539fb1689b870dd271dfb2
mock_valid_create_usdc_token_account_tx = GetTransactionResp.from_json(
    json.dumps(
        {
            "jsonrpc": "2.0",
            "result": {
                "slot": 1039,
                "transaction": {
                    "signatures": [
                        "61h4M3EjVAZ9caw37ygLKpiAdGpsbjTESmrT2zSDBAd19hM3i49DWbQRza5PG3coX2raaaqPKckd5LrRS7h5BiZp"
                    ],
                    "message": {
                        "header": {
                            "numRequiredSignatures": 1,
                            "numReadonlySignedAccounts": 0,
                            "numReadonlyUnsignedAccounts": 6,
                        },
                        "accountKeys": [
                            FEE_PAYER,
                            RECIPIENT_USDC_USER_BANK_ADDRESS,
                            "11111111111111111111111111111111",
                            USDC_MINT,
                            USDC_PDA,
                            "SysvarRent111111111111111111111111111111111",
                            CLAIMABLE_TOKENS_PDA,
                            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        ],
                        "recentBlockhash": "G49zpD1xEJvjeWNDFwRbCrwYp8rH3dKgfvkcZnpubYMW",
                        "instructions": [
                            {
                                "programIdIndex": 6,
                                "accounts": [0, 3, 4, 1, 5, 7, 2],
                                "data": "14DAXhVVokSE25ZP5P4DToK4ts3zZ",
                                "stackHeight": None,
                            }
                        ],
                    },
                },
                "meta": {
                    "err": None,
                    "status": {"Ok": None},
                    "fee": 5000,
                    "preBalances": [19998586040, 0, 1, 1461600, 0, 1009200, 1141440, 1],
                    "postBalances": [
                        19996541760,
                        2039280,
                        1,
                        1461600,
                        0,
                        1009200,
                        1141440,
                        1,
                    ],
                    "innerInstructions": [
                        {
                            "index": 0,
                            "instructions": [
                                {
                                    "programIdIndex": 2,
                                    "accounts": [0, 1, 4],
                                    "data": "R7r7mzYUyce18QDjGswhPZMQ5y7Q58eHcPYaiaAZsGS68TQJgcprBhcjbzoKQiTs4cCNsbjYTrxanQ32T8WPN2am1EN3hNK4VamjnXvqQUezUzTxYFDCkA3tuXbHyBKmooGc7sdQpNfhgWmQhcCL1wvCuBoqiQQo6tg",
                                    "stackHeight": None,
                                },
                                {
                                    "programIdIndex": 7,
                                    "accounts": [1, 3, 4, 5],
                                    "data": "2",
                                    "stackHeight": None,
                                },
                            ],
                        }
                    ],
                    "logMessages": [
                        f"Program {CLAIMABLE_TOKENS_PDA} invoke [1]",
                        "Program log: Instruction: CreateTokenAccount",
                        "Program 11111111111111111111111111111111 invoke [2]",
                        "Program 11111111111111111111111111111111 success",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
                        "Program log: Instruction: InitializeAccount",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 3602 of 1382448 compute units",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
                        f"Program {CLAIMABLE_TOKENS_PDA} consumed 21499 of 1400000 compute units",
                        f"Program {CLAIMABLE_TOKENS_PDA} success",
                    ],
                    "preTokenBalances": [],
                    "postTokenBalances": [
                        {
                            "accountIndex": 1,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": None,
                                "decimals": 6,
                                "amount": "0",
                                "uiAmountString": "0",
                            },
                            "owner": USDC_PDA,
                        }
                    ],
                    "rewards": [],
                    "loadedAddresses": {"writable": [], "readonly": []},
                },
                "blockTime": 1689354934,
            },
            "id": 0,
        }
    )
)


# Create token account for userbank address
mock_valid_create_audio_token_account_tx = GetTransactionResp.from_json(
    json.dumps(
        {
            "jsonrpc": "2.0",
            "result": {
                "slot": 119348547,
                "transaction": {
                    "signatures": [
                        "5vfrb8GUSSjXR3xMzKh7NREFtnnZRD3eZskbyryAtWoRUtac8mDxrc2D9RWt96sYLV1hsgnnhbnm8o6gJ4p7AyMx"
                    ],
                    "message": {
                        "header": {
                            "numRequiredSignatures": 1,
                            "numReadonlySignedAccounts": 0,
                            "numReadonlyUnsignedAccounts": 6,
                        },
                        "accountKeys": [
                            FEE_PAYER,
                            SENDER_ACCOUNT_WAUDIO_ADDRESS,
                            WAUDIO_MINT,
                            WAUDIO_PDA,
                            "SysvarRent111111111111111111111111111111111",
                            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                            "11111111111111111111111111111111",
                            CLAIMABLE_TOKENS_PDA,
                        ],
                        "recentBlockhash": "D2F72MHmv38pnzEZjJfienL72WLvWj7a5i4F82SSu1RH",
                        "instructions": [
                            {
                                "programIdIndex": 7,
                                "accounts": [0, 2, 3, 1, 4, 5, 6],
                                "data": "12k8SxknneEqdTrNyE17w1fLa2Lr3",
                                "stackHeight": None,
                            }
                        ],
                    },
                },
                "meta": {
                    "err": None,
                    "status": {"Ok": None},
                    "fee": 5000,
                    "preBalances": [
                        23307213200,
                        0,
                        1461600,
                        0,
                        1009200,
                        953185920,
                        1,
                        1141440,
                    ],
                    "postBalances": [
                        23305168920,
                        2039280,
                        1461600,
                        0,
                        1009200,
                        953185920,
                        1,
                        1141440,
                    ],
                    "innerInstructions": [
                        {
                            "index": 0,
                            "instructions": [
                                {
                                    "programIdIndex": 6,
                                    "accounts": [0, 1, 3],
                                    "data": "R7r7mFYpVnfogxGmgKgoouv7CPupJtRDwQVv3vdrK5Jc6WMMKQSCJRVvFjiJTnjDsSdhQknmHiuv3mTonKg92uBjwC9jzpaHzmZ3MtdyZEQ5ThmZ7DHSxrqKFhkdj5A7VGKeVhxp9ooWpZQMUQaD7oVU1EgZpvj5SmE",
                                    "stackHeight": None,
                                },
                                {
                                    "programIdIndex": 5,
                                    "accounts": [1, 2, 3, 4],
                                    "data": "2",
                                    "stackHeight": None,
                                },
                            ],
                        }
                    ],
                    "logMessages": [
                        "Program {CLAIMABLE_TOKENS_PDA} invoke [1]",
                        "Program log: Instruction: CreateTokenAccount",
                        "Program 11111111111111111111111111111111 invoke [2]",
                        "Program 11111111111111111111111111111111 success",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
                        "Program log: Instruction: InitializeAccount",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 3272 of 178721 compute units",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
                        "Program {CLAIMABLE_TOKENS_PDA} consumed 25212 of 200000 compute units",
                        "Program {CLAIMABLE_TOKENS_PDA} success",
                    ],
                    "preTokenBalances": [],
                    "postTokenBalances": [
                        {
                            "accountIndex": 1,
                            "mint": WAUDIO_MINT,
                            "uiTokenAmount": {
                                "uiAmount": None,
                                "decimals": 8,
                                "amount": "0",
                                "uiAmountString": "0",
                            },
                            "owner": WAUDIO_PDA,
                        }
                    ],
                    "rewards": [],
                    "loadedAddresses": {"writable": [], "readonly": []},
                },
                "version": "legacy",
                "blockTime": 1644007841,
            },
            "id": 0,
        }
    )
)

# 100 wAudio transfer between user banks (tipping)
mock_valid_waudio_transfer_between_user_banks = GetTransactionResp.from_json(
    json.dumps(
        {
            "jsonrpc": "2.0",
            "result": {
                "slot": 242838213,
                "transaction": {
                    "signatures": [
                        "4RMmBXdRvE9bomvFSEhKcv53ffwwyHfaU33hqVipbynprqgF673dSJJJAZV6kwqW58Ge3Dd926Fg941kJUvFEBwb"
                    ],
                    "message": {
                        "header": {
                            "numRequiredSignatures": 1,
                            "numReadonlySignedAccounts": 0,
                            "numReadonlyUnsignedAccounts": 7,
                        },
                        "accountKeys": [
                            "HXqdXhJiRe2reQVWmWq13V8gjGtVP7rSh27va5gC3M3P",
                            "DQJe1p8CJukkiGc7y4XXDub1ZThiy14k29yhC5rmPZSM",
                            RECEIVER_ACCOUNT_WAUDIO_ADDRESS,
                            SENDER_ACCOUNT_WAUDIO_ADDRESS,
                            "11111111111111111111111111111111",
                            WAUDIO_PDA,
                            CLAIMABLE_TOKENS_PDA,
                            "KeccakSecp256k11111111111111111111111111111",
                            "Sysvar1nstructions1111111111111111111111111",
                            "SysvarRent111111111111111111111111111111111",
                            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        ],
                        "recentBlockhash": "8crN1sya8UYoBDFp2DjDDdFn7vKoLS1NoYoEj1E1JVJ6",
                        "instructions": [
                            {
                                "programIdIndex": 7,
                                "accounts": [],
                                "data": "H4eCheRWTZDTCFYTTmUz3quundBipFSVGxiji3qqK7CEhSLCEvVCUPVSPKEgHvmV1XCtNrtzuL34yKX4kMz9hxBPRyh96LiZqYEdbgGD5qo45KdcFgt7tRioh7P1He5PSLzjTNdoRS2466UajSRXAjChoAfQcKmh6m89fmAy1GqJjxCUJVPKvuc4PM2NzXu9Ls5sV",
                                "stackHeight": None,
                            },
                            {
                                "programIdIndex": 6,
                                "accounts": [0, 3, 2, 1, 5, 9, 8, 4, 10],
                                "data": "6JzBv4aFeZziRJMpjMVqY8G1Zfnw",
                                "stackHeight": None,
                            },
                        ],
                    },
                },
                "meta": {
                    "err": None,
                    "status": {"Ok": None},
                    "fee": 10000,
                    "preBalances": [
                        1679954583,
                        953520,
                        2039280,
                        2039280,
                        1,
                        11030000,
                        1141440,
                        1,
                        0,
                        1009200,
                        934087680,
                    ],
                    "postBalances": [
                        1679944583,
                        953520,
                        2039280,
                        2039280,
                        1,
                        11030000,
                        1141440,
                        1,
                        0,
                        1009200,
                        934087680,
                    ],
                    "innerInstructions": [
                        {
                            "index": 1,
                            "instructions": [
                                {
                                    "programIdIndex": 10,
                                    "accounts": [3, 2, 5, 5],
                                    "data": "3DcCptZte3oM",
                                    "stackHeight": 2,
                                }
                            ],
                        }
                    ],
                    "logMessages": [
                        "Program Ewkv3JahEFRKkcJmpoKB7pXbnUHwjAyXiwEo4ZY2rezQ invoke [1]",
                        "Program log: Instruction: Transfer",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
                        "Program log: Instruction: Transfer",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4728 of 378084 compute units",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
                        "Program Ewkv3JahEFRKkcJmpoKB7pXbnUHwjAyXiwEo4ZY2rezQ consumed 27149 of 400000 compute units",
                        "Program Ewkv3JahEFRKkcJmpoKB7pXbnUHwjAyXiwEo4ZY2rezQ success",
                    ],
                    "preTokenBalances": [
                        {
                            "accountIndex": 2,
                            "mint": "9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM",
                            "uiTokenAmount": {
                                "uiAmount": 476.19608924,
                                "decimals": 8,
                                "amount": "47619608924",
                                "uiAmountString": "476.19608924",
                            },
                            "owner": "5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx",
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 3,
                            "mint": "9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM",
                            "uiTokenAmount": {
                                "uiAmount": 339.66380431,
                                "decimals": 8,
                                "amount": "33966380431",
                                "uiAmountString": "339.66380431",
                            },
                            "owner": "5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx",
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "postTokenBalances": [
                        {
                            "accountIndex": 2,
                            "mint": "9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM",
                            "uiTokenAmount": {
                                "uiAmount": 576.19608924,
                                "decimals": 8,
                                "amount": "57619608924",
                                "uiAmountString": "576.19608924",
                            },
                            "owner": "5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx",
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 3,
                            "mint": "9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM",
                            "uiTokenAmount": {
                                "uiAmount": 239.66380431,
                                "decimals": 8,
                                "amount": "23966380431",
                                "uiAmountString": "239.66380431",
                            },
                            "owner": "5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx",
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "rewards": [],
                    "loadedAddresses": {"writable": [], "readonly": []},
                    "computeUnitsConsumed": 27149,
                },
                "version": "legacy",
                "blockTime": 1705694686,
            },
            "id": 0,
        }
    )
)

# Transfer of 100 wAudio user bank to an external source.
# Counts as audio_transaction_history, but not as a tip.
mock_valid_waudio_transfer_from_user_bank_to_external_address = GetTransactionResp.from_json(
    json.dumps(
        {
            "jsonrpc": "2.0",
            "result": {
                "slot": 242838213,
                "transaction": {
                    "signatures": [
                        "4RMmBXdRvE9bomvFSEhKcv53ffwwyHfaU33hqVipbynprqgF673dSJJJAZV6kwqW58Ge3Dd926Fg941kJUvFEBwb"
                    ],
                    "message": {
                        "header": {
                            "numRequiredSignatures": 1,
                            "numReadonlySignedAccounts": 0,
                            "numReadonlyUnsignedAccounts": 7,
                        },
                        "accountKeys": [
                            "HXqdXhJiRe2reQVWmWq13V8gjGtVP7rSh27va5gC3M3P",
                            "DQJe1p8CJukkiGc7y4XXDub1ZThiy14k29yhC5rmPZSM",
                            EXTERNAL_ACCOUNT_ADDRESS,
                            SENDER_ACCOUNT_WAUDIO_ADDRESS,
                            "11111111111111111111111111111111",
                            WAUDIO_PDA,
                            CLAIMABLE_TOKENS_PDA,
                            "KeccakSecp256k11111111111111111111111111111",
                            "Sysvar1nstructions1111111111111111111111111",
                            "SysvarRent111111111111111111111111111111111",
                            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        ],
                        "recentBlockhash": "8crN1sya8UYoBDFp2DjDDdFn7vKoLS1NoYoEj1E1JVJ6",
                        "instructions": [
                            {
                                "programIdIndex": 7,
                                "accounts": [],
                                "data": "H4eCheRWTZDTCFYTTmUz3quundBipFSVGxiji3qqK7CEhSLCEvVCUPVSPKEgHvmV1XCtNrtzuL34yKX4kMz9hxBPRyh96LiZqYEdbgGD5qo45KdcFgt7tRioh7P1He5PSLzjTNdoRS2466UajSRXAjChoAfQcKmh6m89fmAy1GqJjxCUJVPKvuc4PM2NzXu9Ls5sV",
                                "stackHeight": None,
                            },
                            {
                                "programIdIndex": 6,
                                "accounts": [0, 3, 2, 1, 5, 9, 8, 4, 10],
                                "data": "6JzBv4aFeZziRJMpjMVqY8G1Zfnw",
                                "stackHeight": None,
                            },
                        ],
                    },
                },
                "meta": {
                    "err": None,
                    "status": {"Ok": None},
                    "fee": 10000,
                    "preBalances": [
                        1679954583,
                        953520,
                        2039280,
                        2039280,
                        1,
                        11030000,
                        1141440,
                        1,
                        0,
                        1009200,
                        934087680,
                    ],
                    "postBalances": [
                        1679944583,
                        953520,
                        2039280,
                        2039280,
                        1,
                        11030000,
                        1141440,
                        1,
                        0,
                        1009200,
                        934087680,
                    ],
                    "innerInstructions": [
                        {
                            "index": 1,
                            "instructions": [
                                {
                                    "programIdIndex": 10,
                                    "accounts": [3, 2, 5, 5],
                                    "data": "3DcCptZte3oM",
                                    "stackHeight": 2,
                                }
                            ],
                        }
                    ],
                    "logMessages": [
                        "Program Ewkv3JahEFRKkcJmpoKB7pXbnUHwjAyXiwEo4ZY2rezQ invoke [1]",
                        "Program log: Instruction: Transfer",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
                        "Program log: Instruction: Transfer",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4728 of 378084 compute units",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
                        "Program Ewkv3JahEFRKkcJmpoKB7pXbnUHwjAyXiwEo4ZY2rezQ consumed 27149 of 400000 compute units",
                        "Program Ewkv3JahEFRKkcJmpoKB7pXbnUHwjAyXiwEo4ZY2rezQ success",
                    ],
                    "preTokenBalances": [
                        {
                            "accountIndex": 2,
                            "mint": "9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM",
                            "uiTokenAmount": {
                                "uiAmount": 476.19608924,
                                "decimals": 8,
                                "amount": "47619608924",
                                "uiAmountString": "476.19608924",
                            },
                            "owner": "5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx",
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 3,
                            "mint": "9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM",
                            "uiTokenAmount": {
                                "uiAmount": 339.66380431,
                                "decimals": 8,
                                "amount": "33966380431",
                                "uiAmountString": "339.66380431",
                            },
                            "owner": "5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx",
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "postTokenBalances": [
                        {
                            "accountIndex": 2,
                            "mint": "9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM",
                            "uiTokenAmount": {
                                "uiAmount": 576.19608924,
                                "decimals": 8,
                                "amount": "57619608924",
                                "uiAmountString": "576.19608924",
                            },
                            "owner": "5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx",
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 3,
                            "mint": "9LzCMqDgTKYz9Drzqnpgee3SGa89up3a247ypMj2xrqM",
                            "uiTokenAmount": {
                                "uiAmount": 239.66380431,
                                "decimals": 8,
                                "amount": "23966380431",
                                "uiAmountString": "239.66380431",
                            },
                            "owner": "5ZiE3vAkrdXBgyFL7KqG3RoEGBws4CjRcXVbABDLZTgx",
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "rewards": [],
                    "loadedAddresses": {"writable": [], "readonly": []},
                    "computeUnitsConsumed": 27149,
                },
                "version": "legacy",
                "blockTime": 1705694686,
            },
            "id": 0,
        }
    )
)

# Appears to be a purchase, but doesn't use a recognized instruction
mock_unknown_instruction_tx = GetTransactionResp.from_json(
    json.dumps(
        {
            "jsonrpc": "2.0",
            "result": {
                "slot": 227246439,
                "transaction": {
                    "signatures": [MOCK_SIGNATURE],
                    "message": {
                        "header": {
                            "numRequiredSignatures": 1,
                            "numReadonlySignedAccounts": 0,
                            "numReadonlyUnsignedAccounts": 8,
                        },
                        "accountKeys": [
                            FEE_PAYER,
                            SENDER_USDC_USER_BANK_ADDRESS,
                            NONCE_ACCOUNT_ADDRESS,
                            RECIPIENT_USDC_USER_BANK_ADDRESS,
                            "11111111111111111111111111111111",
                            CLAIMABLE_TOKENS_PDA,
                            USDC_PDA,
                            "KeccakSecp256k11111111111111111111111111111",
                            "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo",
                            "Sysvar1nstructions1111111111111111111111111",
                            "SysvarRent111111111111111111111111111111111",
                            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        ],
                        "recentBlockhash": "5H434VMiHgK7RaJZaBKKcriu4eky8erb9QGfcHJSZquU",
                        "instructions": [
                            {
                                "programIdIndex": 7,
                                "accounts": [],
                                "data": "H4eCheRWTZDTCFYUcyMzE6EhQMZvvvLKJ9g6YaUpbZeoLLgVj1uvwCTdzcb2MzbKHsRjN8DjLYdqxuQEZe2TjUKCuBMrFtpnnLd4RcvBnr4ieHCdH8ZU1N6XDfiqyKB4zenQ9S4viza4ob4gbtmiRS6o6KGEtL3fJQRvaA3tdtSx1rfFogZzwMXAxHrkuxHrpAqfm",
                                "stackHeight": None,
                            },
                            {
                                "programIdIndex": 5,
                                "accounts": [0, 1, 3, 2, 6, 10, 9, 4, 11],
                                "data": "6dMrrkPeSzw2r5huQ6RToaJCaVuu",
                                "stackHeight": None,
                            },
                            {
                                "programIdIndex": 8,
                                "accounts": [0],
                                "data": PURCHASE_TRACK1_MEMO_DATA,
                                "stackHeight": None,
                            },
                        ],
                    },
                },
                "meta": {
                    "err": None,
                    "status": {"Ok": None},
                    "fee": 10000,
                    "preBalances": [
                        1689358166,
                        2039280,
                        953520,
                        2039280,
                        1,
                        1141440,
                        0,
                        1,
                        121159680,
                        0,
                        1009200,
                        934087680,
                    ],
                    "postBalances": [
                        1689348166,
                        2039280,
                        953520,
                        2039280,
                        1,
                        1141440,
                        0,
                        1,
                        121159680,
                        0,
                        1009200,
                        934087680,
                    ],
                    "innerInstructions": [
                        {
                            "index": 1,
                            "instructions": [
                                {
                                    "programIdIndex": 11,
                                    "accounts": [1, 3, 6, 6],
                                    "data": "3mhiKuxuaKy1",
                                    "stackHeight": 2,
                                }
                            ],
                        }
                    ],
                    "logMessages": [
                        f"Program {CLAIMABLE_TOKENS_PDA} invoke [1]",
                        "Program log: Instruction: RandomThing",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
                        "Program log: Instruction: RandomThing",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4728 of 581084 compute units",
                        "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
                        f"Program {CLAIMABLE_TOKENS_PDA} consumed 24149 of 600000 compute units",
                        f"Program {CLAIMABLE_TOKENS_PDA} success",
                        "Program Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo invoke [1]",
                        "Program Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo consumed 588 of 575851 compute units",
                        "Program Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo success",
                    ],
                    "preTokenBalances": [
                        {
                            "accountIndex": 1,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": 1.0,
                                "decimals": 6,
                                "amount": "1000000",
                                "uiAmountString": "1",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 3,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": None,
                                "decimals": 6,
                                "amount": "0",
                                "uiAmountString": "0",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "postTokenBalances": [
                        {
                            "accountIndex": 1,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": None,
                                "decimals": 6,
                                "amount": "0",
                                "uiAmountString": "0",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                        {
                            "accountIndex": 3,
                            "mint": USDC_MINT,
                            "uiTokenAmount": {
                                "uiAmount": 1.0,
                                "decimals": 6,
                                "amount": "1000000",
                                "uiAmountString": "1",
                            },
                            "owner": USDC_PDA,
                            "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        },
                    ],
                    "rewards": [],
                    "loadedAddresses": {"writable": [], "readonly": []},
                    "computeUnitsConsumed": 24737,
                },
                "blockTime": 1698802811,
            },
            "id": 0,
        }
    )
)
