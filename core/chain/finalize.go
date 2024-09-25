package chain

import (
	"context"
	"fmt"

	"github.com/AudiusProject/audius-protocol/core/db"
	gen_proto "github.com/AudiusProject/audius-protocol/core/gen/proto"
	"github.com/AudiusProject/audius-protocol/core/grpc"
	"google.golang.org/protobuf/proto"
)

func (core *CoreApplication) finalizeTransaction(ctx context.Context, msg *gen_proto.SignedTransaction, txHash string) (proto.Message, error) {
	switch t := msg.Transaction.(type) {
	case *gen_proto.SignedTransaction_Plays:
		return core.finalizePlayTransaction(ctx, msg)
	case *gen_proto.SignedTransaction_ValidatorRegistration:
		return core.finalizeRegisterNode(ctx, msg)
	case *gen_proto.SignedTransaction_SlaRollup:
		return core.finalizeSlaRollup(ctx, msg, txHash)
	default:
		return nil, fmt.Errorf("unhandled proto event: %v %T", msg, t)
	}
}

func (core *CoreApplication) persistTxStat(ctx context.Context, tx proto.Message, txhash string, height int64) error {
	if err := core.getDb().InsertTxStat(ctx, db.InsertTxStatParams{
		TxType:      grpc.GetProtoTypeName(tx),
		TxHash:      txhash,
		BlockHeight: height,
	}); err != nil {
		core.logger.Error("error inserting tx stat", "error", err)
	}
	return nil
}
