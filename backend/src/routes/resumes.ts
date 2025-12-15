import express, { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { upload, isUsingS3 } from '../middleware/upload';
import { ResumeModel } from '../models/Resume.model';
import { ResumeVersionModel } from '../models/ResumeVersion.model';
import { s3Service } from '../services/s3';
import { aiService } from '../services/ai';
import { resumeParser } from '../services/resumeParser';
import { resumeGenerator } from '../services/resumeGenerator';
import pool from '../db';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all resumes for the authenticated user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const resumes = await ResumeModel.findByUserId(userId);

    res.json({
      resumes
    });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// IMPORTANT: More specific routes must come before generic :id route
// Download a specific version (most specific)
router.get('/:id/versions/:versionNumber/download', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const resumeId = parseInt(req.params.id);
    const versionNumber = parseInt(req.params.versionNumber);

    if (isNaN(resumeId) || isNaN(versionNumber)) {
      res.status(400).json({ error: 'Invalid resume ID or version number' });
      return;
    }

    // Verify resume exists and belongs to user
    const resume = await ResumeModel.findByIdAndUserId(resumeId, userId);
    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    // Get specific version
    const version = await ResumeVersionModel.findByResumeIdAndVersion(resumeId, versionNumber);
    if (!version) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }

    if (isUsingS3) {
      // Download from S3 - stream through server
      try {
        const buffer = await s3Service.getFileBuffer(version.file_path);
        
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(version.file_name)}"`);
        res.setHeader('Content-Type', version.file_type || 'application/octet-stream');
        res.setHeader('Content-Length', buffer.length);
        
        res.send(buffer);
      } catch (error) {
        console.error('Error downloading file from S3:', error);
        res.status(500).json({ error: 'Error downloading file' });
      }
    } else {
      // Download from local filesystem
      if (!fs.existsSync(version.file_path)) {
        res.status(404).json({ error: 'File not found on server' });
        return;
      }

      res.download(version.file_path, version.file_name, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error downloading file' });
          }
        }
      });
    }
  } catch (error) {
    console.error('Download version error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all versions of a resume (specific)
router.get('/:id/versions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const resumeId = parseInt(req.params.id);

    if (isNaN(resumeId)) {
      res.status(400).json({ error: 'Invalid resume ID' });
      return;
    }

    // Verify resume exists and belongs to user
    const resume = await ResumeModel.findByIdAndUserId(resumeId, userId);
    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    const versions = await ResumeVersionModel.findByResumeId(resumeId);

    res.json({
      versions: versions.map(v => ({
        id: v.id,
        version_number: v.version_number,
        file_name: v.file_name,
        file_size: v.file_size,
        file_type: v.file_type,
        created_at: v.created_at
      }))
    });
  } catch (error: any) {
    console.error('Get versions error:', error);
    
    // Check if it's a table doesn't exist error
    if (error.code === '42P01') {
      res.status(500).json({ 
        error: 'Version system not initialized. Please run: npm run migrate-versions' 
      });
      return;
    }
    
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


// Upload a new resume
router.post('/', upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { title, description } = req.body;

    if (!title) {
      // Delete uploaded file if validation fails
      if (isUsingS3) {
        // Delete from S3
        const fileKey = (req.file as any).key;
        if (fileKey) {
          try {
            await s3Service.deleteFile(fileKey);
          } catch (error) {
            console.error('Error deleting file from S3:', error);
          }
        }
      } else {
        // Delete from local filesystem
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    // Get file path/key - S3 uses 'key', local uses 'path'
    const filePath = isUsingS3 ? (req.file as any).key : req.file.path;

    const resume = await ResumeModel.create({
      user_id: userId,
      title,
      file_name: req.file.originalname,
      file_path: filePath,
      file_size: req.file.size,
      file_type: req.file.mimetype,
      description: description || null
    });

    res.status(201).json({
      message: 'Resume uploaded successfully',
      resume
    });
  } catch (error) {
    // Delete uploaded file if database insert fails
    if (req.file) {
      if (isUsingS3) {
        // Delete from S3
        const fileKey = (req.file as any).key;
        if (fileKey) {
          try {
            await s3Service.deleteFile(fileKey);
          } catch (deleteError) {
            console.error('Error deleting file from S3:', deleteError);
          }
        }
      } else {
        // Delete from local filesystem
        fs.unlinkSync(req.file.path);
      }
    }
    console.error('Upload resume error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate AI-tailored resume
router.post('/generate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { jobTitle, jobDescription, baseResumeId } = req.body;

    if (!jobTitle || !jobDescription) {
      res.status(400).json({ error: 'Job title and description are required' });
      return;
    }

    // Get base resume
    let baseResume;
    if (baseResumeId) {
      baseResume = await ResumeModel.findByIdAndUserId(baseResumeId, userId);
      if (!baseResume) {
        res.status(404).json({ error: 'Base resume not found' });
        return;
      }
    } else {
      // Use most recent resume if none specified
      const resumes = await ResumeModel.findByUserId(userId);
      if (resumes.length === 0) {
        res.status(404).json({ error: 'No resume found to use as base. Please upload a resume first.' });
        return;
      }
      baseResume = resumes[0];
    }

    // Get current version of base resume
    const currentVersion = await ResumeVersionModel.getCurrentVersion(baseResume.id);
    if (!currentVersion) {
      res.status(404).json({ error: 'No version found for base resume' });
      return;
    }

    // Extract text from resume
    let resumeText: string;
    try {
      resumeText = await resumeParser.extractText(
        currentVersion.file_path,
        currentVersion.file_type || ''
      );
    } catch (error: any) {
      console.error('Error extracting text from resume:', error);
      res.status(500).json({ error: 'Failed to extract text from resume file' });
      return;
    }

    if (!resumeText || resumeText.trim().length < 50) {
      res.status(400).json({ error: 'Could not extract sufficient text from resume. Please ensure the file is readable.' });
      return;
    }

    // Extract structured data using AI
    let resumeData;
    try {
      resumeData = await aiService.extractResumeData(resumeText);
    } catch (error: any) {
      console.error('Error extracting resume data:', error);
      res.status(500).json({ error: 'Failed to analyze resume. Please check your OpenAI API key.' });
      return;
    }

    // Generate tailored resume using AI
    let tailoredResumeText: string;
    try {
      tailoredResumeText = await aiService.generateTailoredResume(
        resumeData,
        jobTitle,
        jobDescription
      );
    } catch (error: any) {
      console.error('Error generating tailored resume:', error);
      res.status(500).json({ error: 'Failed to generate tailored resume. Please check your OpenAI API key.' });
      return;
    }

    // Generate file
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const cleanJobTitle = jobTitle
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 50);
    
    const fileName = `${cleanJobTitle}-${uniqueSuffix}.docx`;
    const filePath = isUsingS3 
      ? `resumes/${fileName}`
      : path.join(__dirname, '../../uploads', fileName);

    let buffer: Buffer;
    try {
      buffer = await resumeGenerator.generateDOCX(tailoredResumeText, filePath);
    } catch (error: any) {
      console.error('Error generating DOCX file:', error);
      res.status(500).json({ error: 'Failed to generate resume file' });
      return;
    }

    // Create new resume record
    const newResume = await ResumeModel.create({
      user_id: userId,
      title: `${jobTitle} - AI Tailored`,
      file_name: fileName,
      file_path: filePath,
      file_size: buffer.length,
      file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      description: `AI-generated resume tailored for: ${jobTitle}`
    });

    res.status(201).json({
      message: 'AI-generated resume created successfully',
      resume: newResume
    });
  } catch (error: any) {
    console.error('Generate resume error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate resume' 
    });
  }
});

// Update resume metadata (title, description)
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const resumeId = parseInt(req.params.id);
    const { title, description } = req.body;

    if (isNaN(resumeId)) {
      res.status(400).json({ error: 'Invalid resume ID' });
      return;
    }

    const resume = await ResumeModel.update(resumeId, userId, {
      title,
      description: description !== undefined ? description : undefined
    });

    res.json({
      message: 'Resume updated successfully',
      resume
    });
  } catch (error: any) {
    if (error.message === 'Resume not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error.message === 'No fields to update') {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Update resume error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a resume
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const resumeId = parseInt(req.params.id);

    if (isNaN(resumeId)) {
      res.status(400).json({ error: 'Invalid resume ID' });
      return;
    }

    // Get all versions before deleting resume (cascade will delete versions)
    const versions = await ResumeVersionModel.findByResumeId(resumeId);

    // Delete resume (cascade will delete all versions from database)
    await ResumeModel.delete(resumeId, userId);

    // Delete all version files from storage
    for (const version of versions) {
      if (isUsingS3) {
        try {
          await s3Service.deleteFile(version.file_path);
        } catch (error) {
          console.error('Error deleting file from S3:', error);
        }
      } else {
        if (fs.existsSync(version.file_path)) {
          try {
            fs.unlinkSync(version.file_path);
          } catch (error) {
            console.error('Error deleting file:', error);
          }
        }
      }
    }

    res.json({
      message: 'Resume deleted successfully'
    });
  } catch (error: any) {
    if (error.message === 'Resume not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download a resume file
router.get('/:id/download', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const resumeId = parseInt(req.params.id);

    if (isNaN(resumeId)) {
      res.status(400).json({ error: 'Invalid resume ID' });
      return;
    }

    const resume = await ResumeModel.findByIdAndUserId(resumeId, userId);
    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    // Get the latest version, or fallback to resume's file_path if no versions exist
    let currentVersion = await ResumeVersionModel.getCurrentVersion(resumeId);
    
    // Fallback for resumes that don't have versions yet (before migration)
    if (!currentVersion) {
      // Use resume's file_path as fallback
      if (isUsingS3) {
        try {
          const buffer = await s3Service.getFileBuffer(resume.file_path);
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resume.file_name)}"`);
          res.setHeader('Content-Type', resume.file_type || 'application/octet-stream');
          res.setHeader('Content-Length', buffer.length);
          res.send(buffer);
          return;
        } catch (error) {
          console.error('Error downloading file from S3:', error);
          res.status(500).json({ error: 'Error downloading file' });
          return;
        }
      } else {
        if (!fs.existsSync(resume.file_path)) {
          res.status(404).json({ error: 'File not found on server' });
          return;
        }
        res.download(resume.file_path, resume.file_name, (err) => {
          if (err) {
            console.error('Download error:', err);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Error downloading file' });
            }
          }
        });
        return;
      }
    }

    if (isUsingS3) {
      // Download from S3 - stream through server to avoid CORS issues
      try {
        const buffer = await s3Service.getFileBuffer(currentVersion.file_path);
        
        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(currentVersion.file_name)}"`);
        res.setHeader('Content-Type', currentVersion.file_type || 'application/octet-stream');
        res.setHeader('Content-Length', buffer.length);
        
        // Send the buffer
        res.send(buffer);
      } catch (error) {
        console.error('Error downloading file from S3:', error);
        res.status(500).json({ error: 'Error downloading file' });
      }
    } else {
      // Download from local filesystem
      if (!fs.existsSync(currentVersion.file_path)) {
        res.status(404).json({ error: 'File not found on server' });
        return;
      }

      res.download(currentVersion.file_path, currentVersion.file_name, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error downloading file' });
          }
        }
      });
    }
  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single resume by ID (generic - must be after specific routes)
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const resumeId = parseInt(req.params.id);

    if (isNaN(resumeId)) {
      res.status(400).json({ error: 'Invalid resume ID' });
      return;
    }

    const resume = await ResumeModel.findByIdWithVersions(resumeId, userId);
    if (!resume) {
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    // Return response with versions
    res.json({
      resume: {
        id: resume.id,
        title: resume.title,
        file_name: resume.file_name,
        file_size: resume.file_size,
        file_type: resume.file_type,
        description: resume.description,
        version: resume.version,
        created_at: resume.created_at,
        updated_at: resume.updated_at,
        versions: resume.versions.map(v => ({
          id: v.id,
          version_number: v.version_number,
          file_name: v.file_name,
          file_size: v.file_size,
          file_type: v.file_type,
          created_at: v.created_at
        })),
        current_version: resume.current_version ? {
          id: resume.current_version.id,
          version_number: resume.current_version.version_number,
          file_name: resume.current_version.file_name,
          file_size: resume.current_version.file_size,
          file_type: resume.current_version.file_type,
          created_at: resume.current_version.created_at
        } : null
      }
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload a new version of an existing resume
router.post('/:id/versions', upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const resumeId = parseInt(req.params.id);

    if (isNaN(resumeId)) {
      res.status(400).json({ error: 'Invalid resume ID' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Verify resume exists and belongs to user
    const resume = await ResumeModel.findByIdAndUserId(resumeId, userId);
    if (!resume) {
      // Delete uploaded file if resume not found
      if (isUsingS3) {
        const fileKey = (req.file as any).key;
        if (fileKey) {
          try {
            await s3Service.deleteFile(fileKey);
          } catch (error) {
            console.error('Error deleting file from S3:', error);
          }
        }
      } else {
        fs.unlinkSync(req.file.path);
      }
      res.status(404).json({ error: 'Resume not found' });
      return;
    }

    // Get next version number
    let latestVersion = await ResumeVersionModel.getLatestVersionNumber(resumeId);
    
    // If no versions exist yet, check if resume has file_path (pre-versioning resumes)
    if (latestVersion === 0) {
      // Check if resume has a file_path (old resumes before versioning)
      if (resume.file_path) {
        // Create version 1 from existing resume data
        await ResumeVersionModel.create({
          resume_id: resumeId,
          version_number: 1,
          file_name: resume.file_name,
          file_path: resume.file_path,
          file_size: resume.file_size || 0,
          file_type: resume.file_type || 'application/pdf'
        });
        latestVersion = 1;
      }
    }
    
    const nextVersion = latestVersion + 1;

    // Generate filename based on resume title + version number
    const ext = path.extname(req.file.originalname);
    const cleanTitle = resume.title
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single
      .toLowerCase()
      .trim()
      .substring(0, 100);
    
    const versionFileName = `${cleanTitle}-v${nextVersion}${ext}`;

    // Get file path/key (already uploaded by multer)
    let filePath = isUsingS3 ? (req.file as any).key : req.file.path;
    
    // For S3, we need to rename the file by copying it with new key
    if (isUsingS3) {
      try {
        // Get the uploaded file
        const buffer = await s3Service.getFileBuffer(filePath);
        
        // Delete the old file
        await s3Service.deleteFile(filePath);
        
        // Upload with new name
        const newKey = `resumes/${versionFileName}`;
        await s3Service.uploadFile(newKey, buffer, req.file.mimetype);
        filePath = newKey;
      } catch (error) {
        console.error('Error renaming S3 file:', error);
        // Continue with original path if rename fails
      }
    } else {
      // Rename the file if using local storage
      const newPath = path.join(path.dirname(filePath), versionFileName);
      fs.renameSync(filePath, newPath);
      filePath = newPath;
    }

    // Create new version
    const version = await ResumeVersionModel.create({
      resume_id: resumeId,
      version_number: nextVersion,
      file_name: versionFileName,
      file_path: filePath,
      file_size: req.file.size,
      file_type: req.file.mimetype
    });

    // Update resume's version number and updated_at timestamp
    await pool.query(
      'UPDATE resumes SET version = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [nextVersion, resumeId]
    );

    res.status(201).json({
      message: `Version ${nextVersion} uploaded successfully`,
      version: {
        id: version.id,
        version_number: version.version_number,
        file_name: version.file_name,
        file_size: version.file_size,
        file_type: version.file_type,
        created_at: version.created_at
      }
    });
  } catch (error) {
    // Delete uploaded file if version creation fails
    if (req.file) {
      if (isUsingS3) {
        const fileKey = (req.file as any).key;
        if (fileKey) {
          try {
            await s3Service.deleteFile(fileKey);
          } catch (deleteError) {
            console.error('Error deleting file from S3:', deleteError);
          }
        }
      } else {
        fs.unlinkSync(req.file.path);
      }
    }
    console.error('Upload version error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;

