package console

import (
	"strconv"

	"github.com/AudiusProject/audius-protocol/core/console/components"
	"github.com/AudiusProject/audius-protocol/core/console/utils"
	"github.com/AudiusProject/audius-protocol/core/db"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
)

func (cs *Console) slaPage(c echo.Context) error {
	ctx := c.Request().Context()
	rollupId := c.Param("rollup")

	var rollup db.SlaRollup
	var recentRollups []db.SlaRollup
	var reports []db.SlaNodeReport
	var err error
	var i int
	if rollupId == "" || rollupId == "latest" {
		rollup, err = cs.db.GetLatestSlaRollup(ctx)
	} else if i, err = strconv.Atoi(rollupId); err == nil {
		rollup, err = cs.db.GetSlaRollupWithId(ctx, int32(i))
	} else {
		cs.logger.Error("Sla page called with invalid rollup id")
		return err
	}
	if err != nil {
		cs.logger.Error("Failed to retrieve SlaRollup from db", "error", err)
		return err
	}
	reports, err = cs.db.GetRollupReportsForId(ctx, pgtype.Int4{Int32: rollup.ID, Valid: true})
	if err != nil {
		cs.logger.Error("Failed to reports for latest SlaRollup from db", "error", err)
		return err
	}

	recentRollups, err = cs.db.GetRecentRollups(ctx)
	if err != nil {
		cs.logger.Error("Failed to get recent rollups from db", "error", err)
		return err
	}

	return utils.Render(c, cs.c.SlaPage(components.SlaPageProps{
		Rollup:        rollup,
		Reports:       reports,
		RecentRollups: recentRollups,
	}))
}
