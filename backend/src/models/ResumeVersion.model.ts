import pool from '../db';
import { ResumeVersion, CreateResumeVersionInput } from './types';

export class ResumeVersionModel {
  /**
   * Create a new resume version
   */
  static async create(input: CreateResumeVersionInput): Promise<ResumeVersion> {
    const result = await pool.query(
      `INSERT INTO resume_versions (resume_id, version_number, file_name, file_path, file_size, file_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.resume_id,
        input.version_number,
        input.file_name,
        input.file_path,
        input.file_size,
        input.file_type
      ]
    );

    return this.mapRowToVersion(result.rows[0]);
  }

  /**
   * Find all versions for a resume
   */
  static async findByResumeId(resumeId: number): Promise<ResumeVersion[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM resume_versions 
         WHERE resume_id = $1 
         ORDER BY version_number DESC`,
        [resumeId]
      );

      return result.rows.map(row => this.mapRowToVersion(row));
    } catch (error: any) {
      // If table doesn't exist yet, return empty array
      if (error.code === '42P01') { // Table doesn't exist
        console.warn('resume_versions table does not exist yet. Run migration: npm run migrate-versions');
        return [];
      }
      throw error;
    }
  }

  /**
   * Find specific version by resume ID and version number
   */
  static async findByResumeIdAndVersion(resumeId: number, versionNumber: number): Promise<ResumeVersion | null> {
    const result = await pool.query(
      'SELECT * FROM resume_versions WHERE resume_id = $1 AND version_number = $2',
      [resumeId, versionNumber]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToVersion(result.rows[0]);
  }

  /**
   * Get the latest version number for a resume
   */
  static async getLatestVersionNumber(resumeId: number): Promise<number> {
    try {
      const result = await pool.query(
        'SELECT MAX(version_number) as max_version FROM resume_versions WHERE resume_id = $1',
        [resumeId]
      );

      return result.rows[0]?.max_version || 0;
    } catch (error: any) {
      // If table doesn't exist yet, return 0
      if (error.code === '42P01') { // Table doesn't exist
        console.warn('resume_versions table does not exist yet. Run migration: npm run migrate-versions');
        return 0;
      }
      throw error;
    }
  }

  /**
   * Get the current (latest) version for a resume
   */
  static async getCurrentVersion(resumeId: number): Promise<ResumeVersion | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM resume_versions 
         WHERE resume_id = $1 
         ORDER BY version_number DESC 
         LIMIT 1`,
        [resumeId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToVersion(result.rows[0]);
    } catch (error: any) {
      // If table doesn't exist yet, return null
      if (error.code === '42P01') { // Table doesn't exist
        console.warn('resume_versions table does not exist yet. Run migration: npm run migrate-versions');
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a specific version
   */
  static async delete(resumeId: number, versionNumber: number): Promise<{ file_path: string }> {
    const result = await pool.query(
      'SELECT file_path FROM resume_versions WHERE resume_id = $1 AND version_number = $2',
      [resumeId, versionNumber]
    );

    if (result.rows.length === 0) {
      throw new Error('Version not found');
    }

    const filePath = result.rows[0].file_path;

    await pool.query(
      'DELETE FROM resume_versions WHERE resume_id = $1 AND version_number = $2',
      [resumeId, versionNumber]
    );

    return { file_path: filePath };
  }

  /**
   * Map database row to ResumeVersion object
   */
  private static mapRowToVersion(row: any): ResumeVersion {
    return {
      id: row.id,
      resume_id: row.resume_id,
      version_number: row.version_number,
      file_name: row.file_name,
      file_path: row.file_path,
      file_size: row.file_size,
      file_type: row.file_type,
      created_at: row.created_at
    };
  }
}

