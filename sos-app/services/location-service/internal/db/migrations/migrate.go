package migrations

import (
	"context"
	"embed"
	"fmt"
	"log"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed *.sql
var migrationFiles embed.FS

// Migration represents a database migration
type Migration struct {
	Version int
	Name    string
	SQL     string
}

// RunMigrations executes all pending migrations
func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	// Create migrations table if it doesn't exist
	if err := createMigrationsTable(ctx, pool); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Get applied migrations
	appliedMigrations, err := getAppliedMigrations(ctx, pool)
	if err != nil {
		return fmt.Errorf("failed to get applied migrations: %w", err)
	}

	// Load all migration files
	migrations, err := loadMigrations()
	if err != nil {
		return fmt.Errorf("failed to load migrations: %w", err)
	}

	// Run pending migrations
	for _, migration := range migrations {
		if _, applied := appliedMigrations[migration.Version]; applied {
			log.Printf("Migration %d already applied, skipping", migration.Version)
			continue
		}

		log.Printf("Running migration %d: %s", migration.Version, migration.Name)

		// Execute migration in a transaction
		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("failed to begin transaction: %w", err)
		}

		if _, err := tx.Exec(ctx, migration.SQL); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("failed to execute migration %d: %w", migration.Version, err)
		}

		// Record migration
		if _, err := tx.Exec(ctx,
			"INSERT INTO schema_migrations (version, name) VALUES ($1, $2)",
			migration.Version, migration.Name,
		); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("failed to record migration %d: %w", migration.Version, err)
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("failed to commit migration %d: %w", migration.Version, err)
		}

		log.Printf("Migration %d completed successfully", migration.Version)
	}

	log.Println("All migrations completed successfully")
	return nil
}

func createMigrationsTable(ctx context.Context, pool *pgxpool.Pool) error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)
	`
	_, err := pool.Exec(ctx, query)
	return err
}

func getAppliedMigrations(ctx context.Context, pool *pgxpool.Pool) (map[int]bool, error) {
	rows, err := pool.Query(ctx, "SELECT version FROM schema_migrations")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applied := make(map[int]bool)
	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return nil, err
		}
		applied[version] = true
	}

	return applied, rows.Err()
}

func loadMigrations() ([]Migration, error) {
	entries, err := migrationFiles.ReadDir(".")
	if err != nil {
		return nil, err
	}

	var migrations []Migration
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}

		// Parse version from filename (e.g., 001_create_table.sql)
		var version int
		var name string
		if _, err := fmt.Sscanf(entry.Name(), "%d_", &version); err != nil {
			log.Printf("Skipping invalid migration file: %s", entry.Name())
			continue
		}

		// Extract name from filename
		parts := strings.SplitN(entry.Name(), "_", 2)
		if len(parts) == 2 {
			name = strings.TrimSuffix(parts[1], ".sql")
		}

		// Read SQL content
		content, err := migrationFiles.ReadFile(entry.Name())
		if err != nil {
			return nil, fmt.Errorf("failed to read migration file %s: %w", entry.Name(), err)
		}

		migrations = append(migrations, Migration{
			Version: version,
			Name:    name,
			SQL:     string(content),
		})
	}

	// Sort migrations by version
	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Version < migrations[j].Version
	})

	return migrations, nil
}
