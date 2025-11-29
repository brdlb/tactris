-- Add updated_at column to game_sessions table
-- This migration adds the updated_at column that is expected by the application code

-- Add the updated_at column with a default value
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add a comment to document the column
COMMENT ON COLUMN game_sessions.updated_at IS 'Timestamp of the last update to the game session record';

-- Create or update the trigger function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
DO $$ 
BEGIN
    -- Check if the trigger already exists and drop it if it does
    IF EXISTS (
        SELECT 1 
        FROM information_schema.triggers 
        WHERE trigger_name = 'update_game_sessions_updated_at' 
        AND event_object_table = 'game_sessions'
    ) THEN
        DROP TRIGGER update_game_sessions_updated_at ON game_sessions;
    END IF;

    -- Create the trigger
    CREATE TRIGGER update_game_sessions_updated_at 
        BEFORE UPDATE ON game_sessions 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
END $$;