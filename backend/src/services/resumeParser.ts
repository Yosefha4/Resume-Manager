import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { s3Service } from './s3';
import { isUsingS3 } from '../middleware/upload';
import fs from 'fs';

export const resumeParser = {
  /**
   * Extract text from PDF
   */
  async extractTextFromPDF(filePath: string): Promise<string> {
    let buffer: Buffer;
    
    if (isUsingS3) {
      buffer = await s3Service.getFileBuffer(filePath);
    } else {
      buffer = fs.readFileSync(filePath);
    }

    const data = await pdfParse(buffer);
    return data.text;
  },

  /**
   * Extract text from DOCX
   */
  async extractTextFromDOCX(filePath: string): Promise<string> {
    let buffer: Buffer;
    
    if (isUsingS3) {
      buffer = await s3Service.getFileBuffer(filePath);
    } else {
      buffer = fs.readFileSync(filePath);
    }

    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  },

  /**
   * Extract text from resume file
   */
  async extractText(filePath: string, fileType: string): Promise<string> {
    if (fileType.includes('pdf')) {
      return this.extractTextFromPDF(filePath);
    } else if (fileType.includes('wordprocessingml') || fileType.includes('msword')) {
      return this.extractTextFromDOCX(filePath);
    } else {
      throw new Error('Unsupported file type for text extraction');
    }
  },
};

