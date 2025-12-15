import pool from './index';

async function migrateDatabase() {
  try {
    // Add version column to resumes table if it doesn't exist
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'resumes' AND column_name = 'version'
        ) THEN
          ALTER TABLE resumes ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
        END IF;
      END $$;
    `);
    console.log('✓ Version column added to resumes table');

    // Update existing resumes to have version 1 if they don't have it
    await pool.query(`
      UPDATE resumes SET version = 1 WHERE version IS NULL;
    `);

    console.log('Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error migrating database:', error);
    process.exit(1);
  }
}

migrateDatabase();

