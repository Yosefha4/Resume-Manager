import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';

// Check if AWS S3 is configured
const useS3 = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET_NAME
);

let storage: multer.StorageEngine;

if (useS3) {
  // Initialize S3 client
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  // Configure multer for S3 uploads
  storage = multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    // ACL removed - let bucket defaults handle permissions (requires only s3:PutObject)
    key: (req: any, file: Express.Multer.File, cb: (error: any, key?: string) => void) => {
      // Generate unique identifier
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      
      // Get title from request body (multer parses multipart/form-data)
      let title = '';
      if (req.body && req.body.title) {
        title = req.body.title;
      } else {
        // Fallback to original filename if title not available yet
        title = path.basename(file.originalname, ext);
      }
      
      // Clean and sanitize title for filename
      const cleanTitle = title
        .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/--+/g, '-') // Replace multiple hyphens with single
        .toLowerCase() // Convert to lowercase for consistency
        .trim()
        .substring(0, 100); // Limit length to 100 characters
      
      // If title is empty after cleaning, use a default
      const finalName = cleanTitle || 'resume';
      
      // Store in 'resumes' folder in S3 with format: resumes/title-uniqueId.ext
      const key = `resumes/${finalName}-${uniqueSuffix}${ext}`;
      cb(null, key);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE, // Automatically detect content type
  });
} else {
  // Fallback to local storage if S3 is not configured
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Generate unique identifier
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      
      // Get title from request body
      let title = '';
      if (req.body && req.body.title) {
        title = req.body.title;
      } else {
        // Fallback to original filename if title not available
        title = path.basename(file.originalname, ext);
      }
      
      // Clean and sanitize title for filename
      const cleanTitle = title
        .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/--+/g, '-') // Replace multiple hyphens with single
        .toLowerCase() // Convert to lowercase for consistency
        .trim()
        .substring(0, 100); // Limit length to 100 characters
      
      // If title is empty after cleaning, use a default
      const finalName = cleanTitle || 'resume';
      
      // Format: title-uniqueId.ext
      cb(null, `${finalName}-${uniqueSuffix}${ext}`);
    }
  });
}

// File filter - only allow PDF and DOC files
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and DOC/DOCX files are allowed.'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Export flag to check if S3 is being used
export const isUsingS3 = useS3;
