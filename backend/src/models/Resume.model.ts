import pool from '../db';
import { Resume, CreateResumeInput, UpdateResumeInput, ResumeResponse, ResumeWithVersions } from './types';
import { ResumeVersionModel } from './ResumeVersion.model';
import { ResumeVersionModel } from './ResumeVersion.model';

export class ResumeModel {
  /**
   * Create a new resume
   */
  static async create(input: CreateResumeInput): Promise<ResumeResponse> {
    const result = await pool.query(
      `INSERT INTO resumes (user_id, title, file_name, file_path, file_size, file_type, description, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
       RETURNING id, title, file_name, file_size, file_type, description, version, created_at, updated_at`,
      [
        input.user_id,
        input.title,
        input.file_name,
        input.file_path,
        input.file_size,
        input.file_type,
        input.description || null
      ]
    );

    return this.mapRowToResumeResponse(result.rows[0]);
  }

  /**
   * Find resume by ID
   */
  static async findById(id: number): Promise<Resume | null> {
    const result = await pool.query(
      'SELECT * FROM resumes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToResume(result.rows[0]);
  }

  /**
   * Find resume by ID and user ID (ensures ownership)
   */
  static async findByIdAndUserId(id: number, userId: number): Promise<Resume | null> {
    const result = await pool.query(
      'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToResume(result.rows[0]);
  }

  /**
   * Find resume with all versions
   */
  static async findByIdWithVersions(id: number, userId: number): Promise<ResumeWithVersions | null> {
    const resume = await this.findByIdAndUserId(id, userId);
    if (!resume) {
      return null;
    }

    const versions = await ResumeVersionModel.findByResumeId(id);
    const currentVersion = await ResumeVersionModel.getCurrentVersion(id);

    return {
      id: resume.id,
      title: resume.title,
      file_name: currentVersion?.file_name || resume.file_name,
      file_size: currentVersion?.file_size || resume.file_size,
      file_type: currentVersion?.file_type || resume.file_type,
      description: resume.description,
      version: versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) : 1,
      created_at: resume.created_at,
      updated_at: resume.updated_at,
      versions: versions,
      current_version: currentVersion
    };
  }

  /**
   * Find all resumes for a user
   */
  static async findByUserId(userId: number): Promise<ResumeResponse[]> {
    const result = await pool.query(
      `SELECT id, title, file_name, file_size, file_type, description, version, created_at, updated_at 
       FROM resumes 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    // Get actual version numbers from resume_versions table
    const resumes = await Promise.all(
      result.rows.map(async (row) => {
        try {
          const versions = await ResumeVersionModel.findByResumeId(row.id);
          const actualVersion = versions.length > 0 
            ? Math.max(...versions.map(v => v.version_number)) 
            : row.version || 1;
          
          return {
            ...this.mapRowToResumeResponse(row),
            version: actualVersion
          };
        } catch (error: any) {
          // If table doesn't exist or error, use row version
          if (error.code === '42P01') {
            return this.mapRowToResumeResponse(row);
          }
          throw error;
        }
      })
    );

    return resumes;
  }

  /**
   * Update resume
   */
  static async update(id: number, userId: number, input: UpdateResumeInput): Promise<ResumeResponse> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(input.title);
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(input.description);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    // Don't increment version - version only increments when new file is uploaded
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const result = await pool.query(
      `UPDATE resumes 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount}
       RETURNING id, title, file_name, file_size, file_type, description, version, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Resume not found');
    }

    const updatedResume = this.mapRowToResumeResponse(result.rows[0]);
    
    // Get current version count to update the version field
    const versions = await ResumeVersionModel.findByResumeId(id);
    if (versions.length > 0) {
      updatedResume.version = Math.max(...versions.map(v => v.version_number));
    }

    return updatedResume;
  }

  /**
   * Delete resume
   */
  static async delete(id: number, userId: number): Promise<{ file_path: string }> {
    const result = await pool.query(
      'SELECT file_path FROM resumes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Resume not found');
    }

    const filePath = result.rows[0].file_path;

    await pool.query(
      'DELETE FROM resumes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return { file_path: filePath };
  }

  /**
   * Check if resume exists and belongs to user
   */
  static async exists(id: number, userId: number): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM resumes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Map database row to Resume object
   */
  private static mapRowToResume(row: any): Resume {
    return {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      file_name: row.file_name,
      file_path: row.file_path,
      file_size: row.file_size,
      file_type: row.file_type,
      description: row.description,
      version: row.version || 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Map database row to ResumeResponse object (without sensitive data)
   */
  private static mapRowToResumeResponse(row: any): ResumeResponse {
    return {
      id: row.id,
      title: row.title,
      file_name: row.file_name,
      file_size: row.file_size,
      file_type: row.file_type,
      description: row.description,
      version: row.version || 1,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

