# Migration Generator

The WildayJS Migration Generator helps you create database migrations for schema changes.

## Usage

```bash
wildayjs generate:migration <MigrationName> [attributes]
```

## Examples

### Create Table Migration

```bash
wildayjs generate:migration CreateUsers name:string email:string
```

This generates:

```sql
-- db/migrations/YYYYMMDDHHMMSS_create_users.sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);
```

### Add Column Migration

```bash
wildayjs generate:migration AddPhoneToUsers phone:string
```

### Remove Column Migration

```bash
wildayjs generate:migration RemovePhoneFromUsers phone:string
```

### Add Index Migration

```bash
wildayjs generate:migration AddIndexToUsersEmail
```

## Migration Commands

### Run Migrations

```bash
wildayjs db:migrate
```

### Rollback Migration

```bash
wildayjs db:rollback
# Rollback specific number of migrations
wildayjs db:rollback STEP=3
```

### Migration Status

```bash
wildayjs db:migrate:status
```

## Migration Types

### Table Operations

- Create Table
- Drop Table
- Rename Table
- Change Table

### Column Operations

- Add Column
- Remove Column
- Change Column
- Rename Column

### Index Operations

- Add Index
- Remove Index

### Foreign Key Operations

- Add Foreign Key
- Remove Foreign Key

## Options

- `--db`: Specify database (default: development)
- `--dry-run`: Show migration commands without executing
- `--force`: Override existing migration file

## Best Practices

1. **One Change Per Migration**: Each migration should handle one specific change
2. **Meaningful Names**: Use descriptive names for migrations
3. **Reversible Changes**: Always implement both up and down methods
4. **Test Migrations**: Test both up and down migrations before deploying
```

## Example Workflow

```bash
# Create a new migration
wildayjs generate:migration AddUserSettings

# Edit the migration file
# Run the migration
wildayjs db:migrate

# If something goes wrong
wildayjs db:rollback
``` 