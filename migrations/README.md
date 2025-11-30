# Database Migrations

This directory contains all database migration scripts for the Tactris application. Migrations are used to make changes to the database schema in a controlled and versioned way.

## Migration File Naming Convention

Migration files should follow the naming convention:
```
{timestamp}_{description}.sql
```

For example:
- `2023112812000_initial_schema.sql`
- `20231129143000_add_user_indexes.sql`
- `20231201091500_modify_game_session_constraints.sql`

## Migration Table

The migration system maintains a table called `migrations` to track which migrations have been applied:

```sql
CREATE TABLE migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## How to Create a New Migration

1. Create a new SQL file in this directory with the proper naming convention
2. Write your migration SQL code in the file
3. Run the migration using the migration runner

## How to Run Migrations

Migrations can be run using the migration runner:

```bash
npm run migrate
```

Or programmatically from your application code.