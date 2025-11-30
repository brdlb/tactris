# Schema Modification Process

This document outlines the proper process for modifying the database schema in the Tactris application, including how the `schema.sql` file fits into the overall workflow.

## Understanding the Schema Files

### schema.sql
The `schema.sql` file is a **reference dump** of the current database structure. It contains:
- Complete schema definition of all tables, views, functions, etc.
- Database structure at a specific point in time
- A snapshot that can be used to recreate the database from scratch

**Important**: This file should NOT be directly modified to make schema changes in deployed environments.

### Migration Files
Migration files in the `migrations/` directory are used to:
- Apply incremental changes to the database
- Track which changes have been applied
- Maintain data integrity during schema evolution
- Support rollbacks if needed

## The Correct Process for Schema Changes

### 1. When You Need to Make a Schema Change

Instead of directly modifying `schema.sql`, follow these steps:

#### Step 1: Analyze the Change
- Determine what database objects need to be added, modified, or removed
- Consider the impact on existing data
- Plan for backward compatibility if needed

#### Step 2: Create a Migration
- Create a new migration file in the `migrations/` directory
- Name it with the format: `YYYYMMDDHHMMSS_description.sql`
- Write the SQL commands to make the change
- Include a record in the migrations table

#### Step 3: Update the Reference Schema (Optional)
- After applying migrations, you may want to update `schema.sql`
- This is typically done by exporting the current database structure
- This step is mainly for documentation and development setup

### 2. Example: Adding a New Column

#### ❌ Wrong Approach
Directly editing `schema.sql`:
```sql
-- This is WRONG - don't do this for deployed databases
ALTER TABLE users ADD COLUMN new_column TEXT;
```

#### ✅ Correct Approach
1. Create migration file `migrations/20251128153000_add_new_column.sql`:
```sql
-- Add new_column to users table
ALTER TABLE users ADD COLUMN new_column TEXT DEFAULT 'default_value';
COMMENT ON COLUMN users.new_column IS 'Description of the new column';

-- Record this migration
INSERT INTO migrations (name) VALUES ('20251128153000_add_new_column.sql');
```

2. Run the migration:
```bash
npm run migrate
```

### 3. Updating schema.sql (For Reference)

After applying migrations, if you want to update the reference schema:

```bash
# Connect to your database and export the current schema
pg_dump --schema-only --no-owner --no-privileges -U username -d database_name > schema.sql
```

**Note**: The exported schema will not include the migrations table data, so you may need to add it back manually or run migrations on the new database.

## Development Workflow

### For New Development
1. Plan your schema changes
2. Create migration files for each change
3. Apply migrations to your development database
4. Test your application with the new schema
5. Commit both the migration files and any updated application code

### For Database Reset in Development
If you need to reset your development database to the reference schema:

1. Drop and recreate the database:
```bash
dropdb tactris
createdb tactris
```

2. Import the reference schema:
```bash
psql -d tactris -f schema.sql
```

3. Apply any post-schema migrations (if needed):
```bash
npm run migrate
```

## Production Deployment

### Pre-Deployment Checklist
- [ ] Migration has been tested on a copy of production data
- [ ] Backup of production database is available
- [ ] Migration can be rolled back if needed
- [ ] Application code is ready for the new schema
- [ ] Migration is scheduled during low-traffic period

### Deployment Process
1. Backup the production database
2. Deploy the new application code (including migration files)
3. Run migrations:
```bash
npm run migrate
```
4. Verify the changes are applied correctly
5. Test application functionality
6. Monitor for any issues

## Handling Complex Schema Changes

### Adding Tables
```sql
-- Migration to add a new table
CREATE TABLE new_table (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trigger for updated_at if needed
CREATE TRIGGER update_new_table_updated_at 
    BEFORE UPDATE ON new_table 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE new_table IS 'Description of the new table';

-- Record migration
INSERT INTO migrations (name) VALUES ('2025128160000_add_new_table.sql');
```

### Modifying Existing Tables
```sql
-- Migration to modify an existing table
-- Add new column with default
ALTER TABLE game_sessions ADD COLUMN new_feature_enabled BOOLEAN DEFAULT false;

-- Update existing records if needed
UPDATE game_sessions SET new_feature_enabled = true WHERE condition;

-- Make column NOT NULL if required
ALTER TABLE game_sessions ALTER COLUMN new_feature_enabled SET NOT NULL;

-- Add constraints if needed
ALTER TABLE game_sessions ADD CONSTRAINT chk_valid_value CHECK (column_name > 0);

-- Record migration
INSERT INTO migrations (name) VALUES ('20251128160000_modify_game_sessions.sql');
```

### Removing Tables or Columns
```sql
-- Migration to remove a column (do this carefully!)
-- First, ensure no application code references the column
-- Then remove the column
ALTER TABLE users DROP COLUMN deprecated_column;

-- Record migration
INSERT INTO migrations (name) VALUES ('2025128160000_remove_deprecated_column.sql');
```

## Best Practices

1. **Keep migrations small and focused** - Each migration should address a single concern
2. **Test migrations thoroughly** - Always test on a copy of production data
3. **Consider data migration** - Plan how existing data will be handled
4. **Use transactions** - Wrap related changes in transactions to ensure consistency
5. **Document changes** - Add comments to explain the purpose of schema changes
6. **Plan for rollbacks** - Consider how to undo changes if needed
7. **Update application code** - Ensure your application code works with the new schema

## Troubleshooting

### Migration Fails
1. Check the error message for specific details
2. Verify that the migration is valid SQL
3. Ensure no dependencies are missing
4. Check if the change conflicts with existing data
5. If needed, fix the issue and try again

### Need to Rollback
```bash
npm run rollback
```
Note: The current rollback mechanism simply removes the migration record. For complex changes, you may need to implement specific rollback logic.

### Migration Already Applied
If you need to reapply a migration that's already been recorded:
1. Remove the migration record from the migrations table
2. Manually revert the database changes
3. Reapply the migration

## Summary

Remember:
- Use migration files for all schema changes in deployed environments
- `schema.sql` is a reference for the current schema, not for making changes
- Always test migrations before applying to production
- Keep backups before running migrations on important data
- Document your schema changes with appropriate comments