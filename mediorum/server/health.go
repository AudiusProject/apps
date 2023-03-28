package server

import (
	"strings"
	"time"
)

func (ss *MediorumServer) startHealthBroadcaster() {
	ss.logger.Debug("starting health broadcaster")

	// broadcast health more often on boot (1s)
	// and more slowly after 10s
	count := 0
	delay := time.Second

	for {
		select {
		case <-ss.quit:
			ss.logger.Debug("health broadcaster exit")
			return
		case <-time.After(delay):
			ss.crud.Patch(ss.healthReport())
			count++
			if count > 10 {
				delay = time.Second * 5
			}
		}
	}
}

func (ss *MediorumServer) healthReport() ServerHealth {
	return ServerHealth{
		Host:      ss.Config.Self.Host,
		StartedAt: ss.StartedAt,
		AliveAt:   time.Now().UTC(),
		Version:   vcsRevision,
		BuiltAt:   vcsBuildTime,

		// more health stuff like:
		// pending transcode tasks
		// is deregistering / readonly type of thing
	}
}

func (ss *MediorumServer) findHealthyPeers(aliveInLast string) ([]ServerHealth, error) {
	if !strings.HasPrefix(aliveInLast, "-") {
		aliveInLast = "-" + aliveInLast
	}

	healths := []ServerHealth{}
	err := ss.crud.DB.
		Where("alive_at >= datetime('now', ?)", aliveInLast).
		Order("host").
		Find(&healths).
		Error
	if err != nil {
		ss.logger.Warn(err.Error())
	}
	return healths, err
}

func (ss *MediorumServer) findHealthyHostNames(aliveInLast string) []string {
	hosts := []string{}
	if healths, err := ss.findHealthyPeers(aliveInLast); err == nil {
		for _, health := range healths {
			hosts = append(hosts, health.Host)
		}
	}
	return hosts
}
