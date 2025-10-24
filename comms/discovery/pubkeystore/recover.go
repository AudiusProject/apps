package pubkeystore

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"os"
	"strings"

	"comms.audius.co/discovery/config"
	"comms.audius.co/discovery/db"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/signer/core/apitypes"
	"golang.org/x/exp/slog"
)

var (
	poaClient  *ethclient.Client
	acdcClient *ethclient.Client

	// on staging, and soon prod
	// we will need two clients:
	// a POA client for older users
	// an audius chain client for newer users
	finalPoaBlock     int64 = 31413000
	verifyingContract string
)

func Dial(discoveryConfig *config.DiscoveryConfig) error {
	var err error

	// prod settings
	acdcEndpoint := "https://acdc-gateway.audius.co"
	poaEndpoint := "http://54.241.83.13:8545"
	verifyingContract = "0x981c44040cb6150a2b8a7f63fb182760505bf666"

	// staging settings
	if discoveryConfig.IsStaging {
		acdcEndpoint = "https://acdc-gateway.staging.audius.co"
		poaEndpoint = "http://54.177.176.62:8545"
		verifyingContract = "0x39d26a6a138ddf8b447d651d5d3883644d277251"

		// got from:
		// https://identityservice.staging.audius.co/health_check/poa
		finalPoaBlock = 30000000
	}

	if discoveryConfig.IsDev {
		acdcEndpoint = "http://audius-poa-ganache-1"
		poaEndpoint = "http://audius-poa-ganache-1" // won't ever be used
		verifyingContract = "0x254dffcd3277C0b1660F6d42EFbB754edaBAbC2B"
		finalPoaBlock = -1
	}

	if discoveryConfig.IsSandbox {
		acdcEndpoint = os.Getenv("audius_web3_eth_provider_url")
		poaEndpoint = os.Getenv("audius_web3_host")
		verifyingContract = os.Getenv("audius_contracts_entity_manager_address")
		finalPoaBlock = -1
	}

	poaClient, err = ethclient.Dial(poaEndpoint)
	if err != nil {
		return err
	}

	acdcClient, err = ethclient.Dial(acdcEndpoint)
	if err != nil {
		return err
	}

	return nil
}

func RecoverUserPublicKeyBase64(ctx context.Context, userId int) (string, error) {
	var err error

	logger := slog.With("module", "pubkeystore", "userId", userId)

	conn := db.Conn

	// first check a "pubkey cache" for a hit
	if got, err := GetPubkey(userId); err == nil {
		return got, nil
	}

	query := `
	select wallet, blocknumber, txhash
	from users where user_id = $1 and is_current in (true, false)
	order by blocknumber asc;
	`

	rows, err := conn.QueryContext(ctx, query, userId)
	if err != nil {
		return "", err
	}

	var wallet string
	var blocknumber int64
	var txhash string

	var pubkeyBase64 string

	for rows.Next() {
		err = rows.Scan(&wallet, &blocknumber, &txhash)
		if err != nil {
			continue
		}

		// a couple possible situations:
		// - addUser on POA
		// - entity manager on POA
		// - entity manager on audius chain

		if finalPoaBlock != 0 && blocknumber > finalPoaBlock {
			// EM on Audius Chain
			pubkeyBase64, err = recoverEntityManagerPubkey(acdcClient, txhash, wallet)
			if err == nil {
				break
			}
		} else {
			// try EM on POA
			if strings.HasPrefix(txhash, "0x") {
				pubkeyBase64, err = recoverEntityManagerPubkey(poaClient, txhash, wallet)
				if err == nil {
					break
				}
			}

			// try addUser on POA
			pubkeyBase64, err = findAddUserTransaction(ctx, big.NewInt(blocknumber), wallet)
			if err == nil {
				break
			}
		}

	}

	rows.Close()

	// success
	if err == nil && pubkeyBase64 != "" {
		err = setPubkey(userId, pubkeyBase64)
		if err != nil {
			logger.Warn("setPubkey failed", "err", err)
		}

		return pubkeyBase64, nil
	}

	// users table txhash could come from setting `is_verified` (or similar)
	// which might not be signed by user key.
	// In past is_current=false rows would still contain older versions of user row.
	// but now only latest row is retained.
	// So in that case we must query other tables for a txhash that was signed by user.
	{
		query := `
		with txhashes as (
			select distinct txhash from tracks where owner_id = $1
			union
			select distinct txhash from playlists where playlist_owner_id = $1
			union
			select distinct txhash from saves where user_id = $1
			union
			select distinct txhash from reposts where user_id = $1
			union
			select distinct txhash from follows where follower_user_id = $1
		)
		select txhash from txhashes where txhash like '0x%'
		;
		`

		rows, err = conn.QueryContext(ctx, query, userId)
		if err != nil {
			logger.Error("query failed", "err", err)
			return "", err
		}

		for rows.Next() {
			err = rows.Scan(&txhash)
			if err != nil {
				continue
			}

			pubkeyBase64, err = recoverEntityManagerPubkey(acdcClient, txhash, wallet)
			if err == nil {
				break
			}
		}

		rows.Close()
	}

	// success
	if err == nil && pubkeyBase64 != "" {
		err = setPubkey(userId, pubkeyBase64)
		if err != nil {
			logger.Warn("setPubkey failed", "err", err)
		}

		return pubkeyBase64, nil
	}

	logger.Warn("failed to recover pubkey for user", "err", err)
	return "", errors.New("could not recover pubkey")
}

func unpackTransactionInput(txData []byte) (map[string]interface{}, error) {
	method, err := addUserAbi.MethodById(txData)
	if err != nil {
		return nil, err
	}

	m := map[string]interface{}{}
	err = method.Inputs.UnpackIntoMap(m, txData[4:])
	if err != nil {
		return nil, err
	}

	return m, nil
}

// taken from:
// https://gist.github.com/APTy/f2a6864a97889793c587635b562c7d72#file-main-go
func recoverPublicKey(signature []byte, typedData apitypes.TypedData) ([]byte, error) {

	domainSeparator, err := typedData.HashStruct("EIP712Domain", typedData.Domain.Map())
	if err != nil {
		return nil, fmt.Errorf("eip712domain hash struct: %w", err)
	}

	typedDataHash, err := typedData.HashStruct(typedData.PrimaryType, typedData.Message)
	if err != nil {
		return nil, fmt.Errorf("primary type hash struct: %w", err)
	}

	// add magic string prefix
	rawData := []byte(fmt.Sprintf("\x19\x01%s%s", string(domainSeparator), string(typedDataHash)))
	sighash := crypto.Keccak256(rawData)

	// update the recovery id
	// https://github.com/ethereum/go-ethereum/blob/55599ee95d4151a2502465e0afc7c47bd1acba77/internal/ethapi/api.go#L442
	if len(signature) > 64 {
		signature[64] -= 27
	}

	return crypto.Ecrecover(sighash, signature)

}
