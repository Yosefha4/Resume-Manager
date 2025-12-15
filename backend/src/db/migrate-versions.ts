import pool from './index';

async function migrateVersions() {
  try {
    // Create resume_versions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS resume_versions (
        id SERIAL PRIMARY KEY,
        resume_id INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        file_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(resume_id, version_number)
      )
    `);
    console.log('✓ Resume versions table created');

    // Create index for better performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_resume_versions_resume_id ON resume_versions(resume_id)');
    console.log('✓ Indexes created for resume_versions');

    // Migrate existing resumes to version 1
    const existingResumes = await pool.query('SELECT id, file_name, file_path, file_size, file_type FROM resumes');
    
    for (const resume of existingResumes.rows) {
      // Check if version already exists
      const existingVersion = await pool.query(
        'SELECT id FROM resume_versions WHERE resume_id = $1 AND version_number = 1',
        [resume.id]
      );

      if (existingVersion.rows.length === 0) {
        await pool.query(
          `INSERT INTO resume_versions (resume_id, version_number, file_name, file_path, file_size, file_type)
           VALUES ($1, 1, $2, $3, $4, $5)`,
          [resume.id, resume.file_name, resume.file_path, resume.file_size, resume.file_type]
        );
      }
    }
    console.log(`✓ Migrated ${existingResumes.rows.length} existing resumes to version 1`);

    console.log('Version migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error migrating versions:', error);
    process.exit(1);
  }
}

migrateVersions();

