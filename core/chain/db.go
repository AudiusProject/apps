package chain

import (
	"context"
	"errors"

	"github.com/AudiusProject/audius-protocol/core/db"
	"github.com/jackc/pgx/v5"
)

// returns in current postgres tx for this block
func (c *KVStoreApplication) getDb() *db.Queries {
	return c.queries.WithTx(c.onGoingBlock)
}

func (c *KVStoreApplication) startInProgressTx(ctx context.Context) error {
	dbTx, err := c.pool.Begin(ctx)
	if err != nil {
		return err
	}

	c.onGoingBlock = dbTx
	return nil
}

// commits the current tx that's finished indexing
func (c *KVStoreApplication) commitInProgressTx(ctx context.Context) error {
	if c.onGoingBlock != nil {
		err := c.onGoingBlock.Commit(ctx)
		if err != nil {
			if errors.Is(err, pgx.ErrTxClosed) {
				c.onGoingBlock = nil
				return nil
			}
			return err
		}
		c.onGoingBlock = nil
	}
	return nil
}
