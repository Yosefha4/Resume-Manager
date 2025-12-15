import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

export const s3Service = {
  /**
   * Delete file from S3
   */
  deleteFile: async (key: string): Promise<void> => {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      await s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw error;
    }
  },

  /**
   * Get signed URL for downloading (expires in specified seconds)
   */
  getSignedUrl: async (key: string, expiresIn: number = 3600): Promise<string> => {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  },

  /**
   * Get file stream for direct download through server
   */
  getFileStream: async (key: string) => {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      const response = await s3Client.send(command);
      return response.Body;
    } catch (error) {
      console.error('Error getting file stream from S3:', error);
      throw error;
    }
  },

  /**
   * Upload file to S3
   */
  uploadFile: async (key: string, buffer: Buffer, contentType: string): Promise<void> => {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });
      await s3Client.send(command);
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  },

  /**
   * Get file as buffer (for easier handling)
   */
  getFileBuffer: async (key: string): Promise<Buffer> => {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // AWS SDK v3 returns a stream - convert to buffer
      const stream = response.Body as any;
      const chunks: Buffer[] = [];
      
      // Handle as Node.js Readable stream
      return new Promise((resolve, reject) => {
        if (typeof stream.on === 'function') {
          // Node.js stream
          stream.on('data', (chunk: Buffer | Uint8Array) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
        } else if (typeof stream.transformToByteArray === 'function') {
          // Web stream - convert to byte array
          stream.transformToByteArray()
            .then((array: Uint8Array) => resolve(Buffer.from(array)))
            .catch(reject);
        } else {
          // Try async iteration
          (async () => {
            try {
              const asyncChunks: Uint8Array[] = [];
              for await (const chunk of stream) {
                asyncChunks.push(chunk);
              }
              resolve(Buffer.concat(asyncChunks.map(chunk => Buffer.from(chunk))));
            } catch (err) {
              reject(err);
            }
          })();
        }
      });
    } catch (error) {
      console.error('Error getting file buffer from S3:', error);
      throw error;
    }
  },
};

