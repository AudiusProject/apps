package rpcz

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"comms.audius.co/discovery/config"
	"comms.audius.co/discovery/db"
	"comms.audius.co/discovery/db/queries"
	"comms.audius.co/discovery/misc"
	"comms.audius.co/discovery/schema"
	"github.com/jmoiron/sqlx"
	"github.com/tidwall/gjson"
	"golang.org/x/exp/slog"
)

type RPCProcessor struct {
	sync.Mutex
	validator *Validator

	peerClients []*PeerClient

	discoveryConfig *config.DiscoveryConfig
	httpClient      http.Client
}

func NewProcessor(discoveryConfig *config.DiscoveryConfig) (*RPCProcessor, error) {

	// set up validator + limiter
	limiter, err := NewRateLimiter()
	if err != nil {
		return nil, err
	}
	validator := &Validator{
		db:      db.Conn,
		limiter: limiter,
	}

	proc := &RPCProcessor{
		validator:       validator,
		discoveryConfig: discoveryConfig,
		peerClients:     []*PeerClient{},
		httpClient: http.Client{
			Timeout: 5 * time.Second,
		},
	}

	// setup peer clients
	for _, peer := range discoveryConfig.Peers() {
		if strings.EqualFold(peer.Wallet, discoveryConfig.MyWallet) {
			continue
		}
		if peer.Host == "" {
			slog.Info("bad peer", "peer", peer)
			continue
		}
		proc.peerClients = append(proc.peerClients, NewPeerClient(peer.Host, proc))
	}

	return proc, nil
}

func (proc *RPCProcessor) SweeperErrors() []string {
	var errors []string
	for _, p := range proc.peerClients {
		if p.err != nil {
			errors = append(errors, fmt.Sprintf("%s: %s", p.Host, p.err))
		}
	}
	return errors
}

func (proc *RPCProcessor) StartPeerClients() {
	for _, p := range proc.peerClients {
		p.Start()
	}
}

func (proc *RPCProcessor) Validate(userId int32, rawRpc schema.RawRPC) error {
	return proc.validator.Validate(userId, rawRpc)
}

// ApplyAndPublish:
//   - timestamps message
//   - applies locally
//   - pushes to peers.
func (proc *RPCProcessor) ApplyAndPublish(rpcLog *schema.RpcLog) (*schema.RpcLog, error) {

	if rpcLog.RelayedBy == "" {
		rpcLog.RelayedBy = proc.discoveryConfig.MyHost
	}
	if rpcLog.RelayedAt.IsZero() {
		rpcLog.RelayedAt = time.Now()
	}

	// apply
	err := proc.Apply(rpcLog)
	if err != nil {
		return nil, err
	}

	// publish event
	j, err := json.Marshal(rpcLog)
	if err != nil {
		slog.Error("err: invalid json", err)
	} else {
		proc.broadcast(j)
	}

	return rpcLog, nil
}

// Validates + applies a message
func (proc *RPCProcessor) Apply(rpcLog *schema.RpcLog) error {

	logger := slog.With("sig", rpcLog.Sig)
	var err error

	// check for already applied
	var exists int
	db.Conn.Get(&exists, `select count(*) from rpc_log where sig = $1`, rpcLog.Sig)
	if exists == 1 {
		logger.Debug("rpc already in log, skipping duplicate", "sig", rpcLog.Sig)
		return nil
	}

	startTime := time.Now()
	takeSplit := func() time.Duration {
		split := time.Since(startTime)
		startTime = time.Now()
		return split
	}

	// validate signing wallet
	wallet, err := misc.RecoverWallet(rpcLog.Rpc, rpcLog.Sig)
	if err != nil {
		logger.Warn("unable to recover wallet, skipping")
		return nil
	}
	logger.Debug("recovered wallet", "took", takeSplit())

	if wallet != rpcLog.FromWallet {
		logger.Warn("recovered wallet no match", "recovered", wallet, "expected", rpcLog.FromWallet, "realeyd_by", rpcLog.RelayedBy)
		return nil
	}

	// parse raw rpc
	var rawRpc schema.RawRPC
	err = json.Unmarshal(rpcLog.Rpc, &rawRpc)
	if err != nil {
		logger.Info(err.Error())
		return nil
	}

	// check for "internal" message...
	if strings.HasPrefix(rawRpc.Method, "internal.") {
		err := proc.applyInternalMessage(rpcLog, &rawRpc)
		if err != nil {
			logger.Info("failed to apply internal rpc", "error", err)
		} else {
			logger.Info("applied internal RPC", "sig", rpcLog.Sig)
		}
		return nil
	}

	// get ts
	messageTs := rpcLog.RelayedAt

	userId, err := GetRPCCurrentUserID(rpcLog, &rawRpc)
	if err != nil {
		logger.Info("unable to get user ID")
		return err // or nil?
	}

	logger = logger.With("wallet", wallet, "userId", userId, "relayed_by", rpcLog.RelayedBy, "relayed_at", rpcLog.RelayedAt, "sig", rpcLog.Sig)
	logger.Debug("got user", "took", takeSplit())

	attemptApply := func() error {

		// write to db
		tx, err := db.Conn.Beginx()
		if err != nil {
			return err
		}
		defer tx.Rollback()

		logger.Debug("begin tx", "took", takeSplit(), "sig", rpcLog.Sig)

		count, err := insertRpcLogRow(tx, rpcLog)
		if err != nil {
			return err
		}
		if count == 0 {
			// No rows were inserted because the sig (id) is already in rpc_log.
			// Do not process redelivered messages that have already been processed.
			logger.Info("rpc already in log, skipping duplicate", "sig", rpcLog.Sig)
			return nil
		}
		logger.Debug("inserted RPC", "took", takeSplit())

		switch schema.RPCMethod(rawRpc.Method) {
		case schema.RPCMethodChatCreate:
			var params schema.ChatCreateRPCParams
			err = json.Unmarshal(rawRpc.Params, &params)
			if err != nil {
				return err
			}
			err = chatCreate(tx, userId, messageTs, params)
			if err != nil {
				return err
			}
		case schema.RPCMethodChatDelete:
			var params schema.ChatDeleteRPCParams
			err = json.Unmarshal(rawRpc.Params, &params)
			if err != nil {
				return err
			}
			err = chatDelete(tx, userId, params.ChatID, messageTs)
			if err != nil {
				return err
			}
		case schema.RPCMethodChatMessage:
			var params schema.ChatMessageRPCParams
			err = json.Unmarshal(rawRpc.Params, &params)
			if err != nil {
				return err
			}
			err = chatSendMessage(tx, userId, params.ChatID, params.MessageID, messageTs, params.Message)
			if err != nil {
				return err
			}
		case schema.RPCMethodChatReact:
			var params schema.ChatReactRPCParams
			err = json.Unmarshal(rawRpc.Params, &params)
			if err != nil {
				return err
			}
			err = chatReactMessage(tx, userId, params.MessageID, params.Reaction, messageTs)
			if err != nil {
				return err
			}

		case schema.RPCMethodChatRead:
			var params schema.ChatReadRPCParams
			err = json.Unmarshal(rawRpc.Params, &params)
			if err != nil {
				return err
			}
			// do nothing if last active at >= message timestamp
			lastActive, err := queries.LastActiveAt(tx, context.Background(), queries.ChatMembershipParams{
				ChatID: params.ChatID,
				UserID: userId,
			})
			if err != nil {
				return err
			}
			if !lastActive.Valid || messageTs.After(lastActive.Time) {
				err = chatReadMessages(tx, userId, params.ChatID, messageTs)
				if err != nil {
					return err
				}
			}
		case schema.RPCMethodChatPermit:
			var params schema.ChatPermitRPCParams
			err = json.Unmarshal(rawRpc.Params, &params)
			if err != nil {
				return err
			}
			err = chatSetPermissions(tx, userId, params.Permit, messageTs)
			if err != nil {
				return err
			}
		case schema.RPCMethodChatBlock:
			var params schema.ChatBlockRPCParams
			err = json.Unmarshal(rawRpc.Params, &params)
			if err != nil {
				return err
			}
			blockeeUserId, err := misc.DecodeHashId(params.UserID)
			if err != nil {
				return err
			}
			err = chatBlock(tx, userId, int32(blockeeUserId), messageTs)
			if err != nil {
				return err
			}
		case schema.RPCMethodChatUnblock:
			var params schema.ChatUnblockRPCParams
			err = json.Unmarshal(rawRpc.Params, &params)
			if err != nil {
				return err
			}
			unblockedUserId, err := misc.DecodeHashId(params.UserID)
			if err != nil {
				return err
			}
			err = chatUnblock(tx, userId, int32(unblockedUserId), messageTs)
			if err != nil {
				return err
			}
		default:
			logger.Warn("no handler for ", rawRpc.Method)
		}

		logger.Debug("called handler", "took", takeSplit())

		err = tx.Commit()
		if err != nil {
			return err
		}
		logger.Debug("commited", "took", takeSplit())

		// send out websocket events fire + forget style
		websocketNotify(rpcLog.Rpc, userId, messageTs.Round(time.Microsecond))
		logger.Debug("websocket push done", "took", takeSplit())

		return nil
	}

	err = attemptApply()
	if err != nil {
		logger.Warn("apply failed", "err", err)
	}
	return err
}

func (proc *RPCProcessor) applyInternalMessage(rpcLog *schema.RpcLog, rawRpc *schema.RawRPC) error {
	logger := slog.With("method", rawRpc.Method, "sig", rpcLog.Sig)

	// verify wallet is a registered node
	isValid := false
	for _, peer := range proc.discoveryConfig.Peers() {
		if strings.EqualFold(rpcLog.FromWallet, peer.Wallet) {
			isValid = true
			break
		}
	}
	if !isValid {
		return fmt.Errorf("internal rpc: wallet %s not registered node", rpcLog.FromWallet)
	}

	// begin tx
	tx, err := db.Conn.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	rowsAffected, err := insertRpcLogRow(tx, rpcLog)
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		logger.Info("internal RPC already applied... skipping")
		return nil
	}

	params := struct {
		UserIDs []string `json:"user_ids" db:"user_ids"`
	}{}
	err = json.Unmarshal(rawRpc.Params, &params)
	if err != nil {
		return err
	}

	switch rawRpc.Method {
	case "internal.chat.ban":
		for _, userId := range params.UserIDs {
			_, err := tx.Exec(`insert into chat_ban values ($1) on conflict do nothing`, userId)
			if err != nil {
				logger.Error("failed", err)
			}
		}
	case "internal.chat.unban":
		for _, userId := range params.UserIDs {
			_, err := tx.Exec(`delete from chat_ban where user_id = $1`, userId)
			if err != nil {
				logger.Error("failed", err)
			}
		}

	default:
		fmt.Println("unknown internal method: ", rawRpc.Method)

	}

	return tx.Commit()
}

func insertRpcLogRow(tx *sqlx.Tx, rpcLog *schema.RpcLog) (int64, error) {
	query := `
		INSERT INTO rpc_log (relayed_by, relayed_at, applied_at, from_wallet, rpc, sig)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT DO NOTHING
		`
	result, err := tx.Exec(query, rpcLog.RelayedBy, rpcLog.RelayedAt, time.Now(), rpcLog.FromWallet, rpcLog.Rpc, rpcLog.Sig)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func websocketNotify(rpcJson json.RawMessage, userId int32, timestamp time.Time) {
	if chatId := gjson.GetBytes(rpcJson, "params.chat_id").String(); chatId != "" {

		var userIds []int32
		err := db.Conn.Select(&userIds, `select user_id from chat_member where chat_id = $1`, chatId)
		if err != nil {
			logger.Warn("failed to load chat members for websocket push " + err.Error())
			return
		}

		encodedUserId, _ := misc.EncodeHashId(int(userId))

		// this struct should match ChatWebsocketEventData
		// but we create a matching anon struct here
		// so we can simply pass thru the RPC as a json.RawMessage
		// which is simpler than satisfying the quicktype generated schema.RPC struct
		data := struct {
			RPC      json.RawMessage `json:"rpc"`
			Metadata schema.Metadata `json:"metadata"`
		}{
			rpcJson,
			schema.Metadata{Timestamp: timestamp.Format(time.RFC3339Nano), UserID: encodedUserId},
		}

		j, err := json.Marshal(data)
		if err != nil {
			logger.Warn("invalid websocket json " + err.Error())
			return
		}

		for _, subscribedUserId := range userIds {
			websocketPush(subscribedUserId, j)
		}

	}
}

func GetRPCCurrentUserID(rpcLog *schema.RpcLog, rawRpc *schema.RawRPC) (int32, error) {
	// attempt to read the (newly added) current_user_id field
	if rawRpc.CurrentUserID != "" {
		if u, err := misc.DecodeHashId(rawRpc.CurrentUserID); err == nil && u > 0 {
			// valid current_user_id + wallet combo?
			// for now just check that the pair exists in the user table
			// in the future this can check a "grants" table that a given operation is permitted
			isValid := false
			db.Conn.QueryRow(`select count(*) > 0 from users where is_current = true and user_id = $1 and wallet = lower($2)`, u, rpcLog.FromWallet).Scan(&isValid)
			if isValid {
				return int32(u), nil
			}
		}
	}

	// fallback to finding user ID from wallet
	// we can remove this when all clients send current_user_id
	return queries.GetUserIDFromWallet(db.Conn, context.Background(), rpcLog.FromWallet)
}
