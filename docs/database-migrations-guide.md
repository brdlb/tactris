# Database Migrations Guide

This document explains how to properly make changes to the database structure in the Tactris application using the migration system.

## Overview

The Tactris application uses a migration-based approach to manage database schema changes. This ensures that:

- Schema changes are versioned and tracked
- Changes can be applied consistently across different environments
- Rollbacks are possible if needed
- Multiple developers can make schema changes without conflicts

## The Current Approach vs. Recommended Approach

### ❌ Current Approach (Not Recommended)
Directly modifying the `schema.sql` file and using it to recreate the database:
- Can lead to data loss in production
- No tracking of when changes were applied
- Difficult to coordinate changes across environments
- Risk of applying changes in wrong order

### ✅ Recommended Approach (Using Migrations)
Using the migration system:
- Tracks which changes have been applied
- Ensures changes are applied in the correct order
- Maintains data integrity during schema changes
- Works consistently across development, staging, and production

## How to Make Database Changes

### 1. Plan Your Schema Change

Before making any changes, consider:

- What tables/columns need to be added, modified, or removed?
- Will this change affect existing data?
- Do you need to migrate existing data?
- What are the dependencies between tables?
- How will you handle the change in the application code?

### 2. Create a New Migration File

Create a new SQL file in the `migrations/` directory with the naming convention:
```
YYYYMMDDHHMMSS_description.sql
```

For example:
- `20251128143000_add_user_last_login.sql`
- `20251129091500_modify_game_session_constraints.sql`

### 3. Write the Migration SQL

Your migration file should contain:

```sql
-- Migration to add last_login column to users table
-- Description: Adds a last_login timestamp column to track user activity

-- Add new column
ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;

-- Update the column for existing users (optional)
UPDATE users SET last_login = created_at WHERE last_login IS NULL;

-- Make the column NOT NULL if required
ALTER TABLE users ALTER COLUMN last_login SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.last_login IS 'Timestamp of the user''s last login';

-- Record this migration as applied (required)
INSERT INTO migrations (name) VALUES ('20251128143000_add_user_last_login.sql');
```

### 4. Consider Migration Best Practices

When writing migrations, follow these best practices:

#### For Adding Columns:
```sql
-- Safe: Add with default value
ALTER TABLE table_name ADD COLUMN new_column TEXT DEFAULT 'default_value';

-- Safe: Add as nullable, then update values, then make NOT NULL
ALTER TABLE table_name ADD COLUMN new_column TEXT;
UPDATE table_name SET new_column = 'some_value' WHERE condition;
ALTER TABLE table_name ALTER COLUMN new_column SET NOT NULL;
```

#### For Removing Columns:
```sql
-- First, remove all references in application code
-- Then, drop the column
ALTER TABLE table_name DROP COLUMN old_column;
```

#### For Modifying Columns:
```sql
-- Changing data type
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_type;

-- Adding constraints
ALTER TABLE table_name ADD CONSTRAINT constraint_name CHECK (condition);

-- Removing constraints
ALTER TABLE table_name DROP CONSTRAINT constraint_name;
```

#### For Adding Tables:
```sql
CREATE TABLE new_table (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE new_table IS 'Description of the new table';
```

### 5. Test Your Migration

Before applying to production:

1. Test on a development database with sample data
2. Verify the migration can be applied without errors
3. Check that application functionality still works
4. If possible, test the rollback process

### 6. Apply the Migration

Run the migration using the command line:

```bash
npm run migrate
```

This will apply all pending migrations in chronological order.

## Migration File Structure

Each migration file should follow this structure:

```sql
-- Brief description of what the migration does
-- Description: Full description of the changes being made

-- Your SQL statements here
-- Add, modify, or remove database objects

-- Update the migrations table (required)
INSERT INTO migrations (name) VALUES ('YYYYMMDDHHMMSS_description.sql');
```

## Handling Data Migration

If your schema change requires transforming existing data:

```sql
-- Example: Migrating data from one format to another
-- Add temporary column
ALTER TABLE users ADD COLUMN temp_preferences JSONB;

-- Migrate data from old format to new format
UPDATE users 
SET temp_preferences = 
    jsonb_build_object(
        'theme', old_theme,
        'sound', old_sound_enabled
    )
WHERE old_theme IS NOT NULL OR old_sound_enabled IS NOT NULL;

-- Drop old columns
ALTER TABLE users DROP COLUMN old_theme;
ALTER TABLE users DROP COLUMN old_sound_enabled;

-- Rename temporary column to final name
ALTER TABLE users RENAME COLUMN temp_preferences TO preferences;
```

## Rollback Strategy

For production systems, consider how to rollback changes if needed:

1. **Simple structural changes**: Often, you can create a reverse migration
2. **Data modifications**: Keep backups before applying migrations
3. **Complex changes**: Test the rollback process in development first

The current rollback script removes the migration record, but for production, you may want to implement specific rollback logic.

## Schema.sql File Purpose

The `schema.sql` file serves as a reference for the current database structure and is useful for:

- Setting up a fresh database instance
- Understanding the complete schema at a point in time
- Initial database setup in development

**Important**: Do not use `schema.sql` directly to make schema changes in deployed environments. Always use migrations.

## Environment-Specific Considerations

- **Development**: Migrations can be applied freely, and the database can be reset
- **Staging**: Migrations should mirror production as closely as possible
- **Production**: 
 - Always backup before running migrations
  - Test migrations on a copy of production data first
  - Schedule migrations during low-traffic periods
  - Have a rollback plan ready

## Troubleshooting Common Issues

### Migration Already Applied Error
If a migration fails partway through, the transaction system should handle rollbacks. If not, you may need to manually fix the database state and migration record.

### Dependencies Between Tables
When adding foreign keys, ensure the referenced table exists. Order your migrations appropriately.

### Performance Considerations
For large tables, consider:
- Adding indexes during off-peak hours
- Breaking large data updates into smaller chunks
- Using `CONCURRENTLY` for index creation (PostgreSQL specific)

## Example: Adding a New Feature with Database Changes

Let's say you want to add a "friend list" feature:

1. Create migration file: `migrations/20251128150000_add_friendships_table.sql`
2. Write the migration:
```sql
-- Add friendships table for friend list feature
CREATE TABLE friendships (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- Add updated_at trigger
CREATE TRIGGER update_friendships_updated_at 
    BEFORE UPDATE ON friendships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE friendships IS 'User friendship relationships';
COMMENT ON COLUMN friendships.status IS 'Status of the friendship: pending, accepted, blocked';

-- Record migration
INSERT INTO migrations (name) VALUES ('20251128150000_add_friendships_table.sql');
```

3. Update your application code to use the new table
4. Test the changes
5. Deploy with the migration

## Conclusion

Using the migration system ensures your database schema changes are safe, trackable, and reproducible across environments. Always remember to:
- Test migrations thoroughly before applying to production
- Keep migrations small and focused
- Consider the impact on existing data
- Have a rollback plan
- Update application code to work with new schema