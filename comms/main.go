package main

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"time"

	"comms.audius.co/config"
	"comms.audius.co/db"
	"comms.audius.co/internal/pubkeystore"
	"comms.audius.co/peering"
	"comms.audius.co/server"
	"golang.org/x/sync/errgroup"
)

func main() {
	config.Init()

	// dial datasources in parallel
	g := errgroup.Group{}
	g.Go(func() error {
		return peering.PollDiscoveryProviders()
	})
	g.Go(func() error {
		return db.Dial()
	})
	g.Go(func() error {
		return pubkeystore.Dial()
	})
	if err := g.Wait(); err != nil {
		log.Fatal(err)
	}

	// run migrations
	out, err := exec.Command("dbmate", "--no-dump-schema", "--url", os.Getenv("audius_db_url"), "up").CombinedOutput()
	if err != nil {
		log.Fatalf("dbmate: %s %s \n", err, out)
	}
	fmt.Println("dbmate: ", string(out))

	// start solicit...
	go func() {
		time.Sleep(500 * time.Millisecond)

		for {
			peering.Solicit()
			time.Sleep(time.Minute * 5)
		}
	}()

	server.Start()
}
