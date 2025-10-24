package pubkeystore

import (
	"crypto/ecdsa"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/AudiusProject/audiusd/pkg/core/gen/core_proto"
	"github.com/ethereum/go-ethereum/common/math"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/signer/core/apitypes"
)

type CoreTransaction struct {
	BlockID     int    `db:"block_id"`
	TxHash      string `db:"tx_hash"`
	Transaction []byte
}

func recoverPubkeyFromCoreTx(em *core_proto.ManageEntityLegacy) (string, *ecdsa.PublicKey, error) {

	// prod values
	// see:
	// apps/packages/sdk/src/sdk/config/production.ts
	contractAddress := "0x1Cd8a543596D499B9b6E7a6eC15ECd2B7857Fd64"
	chainId := 31524

	var nonce [32]byte
	copy(nonce[:], toBytes(em.Nonce))

	var typedData = apitypes.TypedData{
		Types: apitypes.Types{
			"EIP712Domain": []apitypes.Type{
				{
					Name: "name",
					Type: "string",
				},
				{
					Name: "version",
					Type: "string",
				},
				{
					Name: "chainId",
					Type: "uint256",
				},
				{
					Name: "verifyingContract",
					Type: "address",
				},
			},
			"ManageEntity": []apitypes.Type{
				{
					Name: "userId",
					Type: "uint",
				},
				{
					Name: "entityType",
					Type: "string",
				},
				{
					Name: "entityId",
					Type: "uint",
				},
				{
					Name: "action",
					Type: "string",
				},
				{
					Name: "metadata",
					Type: "string",
				},
				{
					Name: "nonce",
					Type: "bytes32",
				},
			},
		},
		Domain: apitypes.TypedDataDomain{
			Name:              "Entity Manager",
			Version:           "1",
			ChainId:           math.NewHexOrDecimal256(int64(chainId)),
			VerifyingContract: contractAddress,
		},
		PrimaryType: "ManageEntity",
		Message: map[string]interface{}{
			"userId":     fmt.Sprintf("%d", em.UserId),
			"entityType": em.EntityType,
			"entityId":   fmt.Sprintf("%d", em.EntityId),
			"action":     em.Action,
			"metadata":   em.Metadata,
			"nonce":      nonce,
		},
	}

	pubkeyBytes, err := recoverPublicKey(toBytes(em.Signature), typedData)
	if err != nil {
		return "", nil, err
	}

	pubkey, err := crypto.UnmarshalPubkey(pubkeyBytes)
	if err != nil {
		return "", nil, err
	}

	address := crypto.PubkeyToAddress(*pubkey).String()
	return address, pubkey, nil
}

func toBytes(str string) []byte {
	v, _ := hex.DecodeString(strings.TrimPrefix(str, "0x"))
	return v
}
