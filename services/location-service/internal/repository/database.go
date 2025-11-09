package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/sos-app/location-service/internal/db/migrations"
)

// Database wraps the pgx connection pool
type Database struct {
	Pool *pgxpool.Pool
}

// NewDatabase creates a new database connection pool
func NewDatabase(connectionString string) (*Database, error) {
	config, err := pgxpool.ParseConfig(connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to parse connection string: %w", err)
	}

	// Configure connection pool
	config.MaxConns = 100
	config.MinConns = 10
	config.MaxConnLifetime = 0
	config.MaxConnIdleTime = 0

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	db := &Database{Pool: pool}

	// Run migrations
	if err := migrations.RunMigrations(context.Background(), pool); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	return db, nil
}

// Close closes the database connection pool
func (db *Database) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}

// Ping checks if the database is reachable
func (db *Database) Ping(ctx context.Context) error {
	return db.Pool.Ping(ctx)
}
