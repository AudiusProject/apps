package server

import (
	"github.com/labstack/echo/v4"
)

type Metrics struct {
	Host         string
	Uploads      int64
	ProblemBlobs int64
}

func (ss *MediorumServer) getMetrics(c echo.Context) error {
	m := Metrics{}
	m.Host = ss.Config.Self.Host

	count, err := ss.findProblemBlobsCount(false)
	if err != nil {
		return err
	}
	m.ProblemBlobs = count
	var ucount int64
	uploads := []*Upload{}
	ss.crud.DB.Order("created_at desc").Find(&uploads).Count(&ucount)
	m.Uploads = ucount

	return c.JSON(200, m)
}
