// When using S3, Lambda converts DOCX to PDF and deletes the DOCX - we serve the PDF

export function getS3PdfKey(key: string): string {
    if (!key || !key.toLowerCase().endsWith('.docx')) return key;
    return key.replace(/\.docx$/i, '.pdf');
  }
  
  export function getS3PdfFileName(fileName: string): string {
    if (!fileName || !fileName.toLowerCase().endsWith('.docx')) return fileName;
    return fileName.replace(/\.docx$/i, '.pdf');
  }
  
  export function usePdfForDocxInS3(filePath: string, isUsingS3: boolean): boolean {
    return !!isUsingS3 && !!filePath && filePath.toLowerCase().endsWith('.docx');
  }