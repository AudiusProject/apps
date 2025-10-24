package ddl

import (
	"fmt"
	"os"
	"os/exec"

	"api.audius.co/config"
)

func RunMigrations() error {
	if !config.Cfg.RunMigrations {
		fmt.Println("Skipping migrations. Set env runMigrations=true to run.")
		return nil
	}

	cmd := exec.Command("sh", "pg_migrate.sh")
	cmd.Dir = "ddl"

	cmd.Env = append(os.Environ(),
		"DB_URL="+config.Cfg.WriteDbUrl,
	)

	out, err := cmd.CombinedOutput()
	fmt.Println("pg_migrate.sh: ", string(out))
	return err
}
