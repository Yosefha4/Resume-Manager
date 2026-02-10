const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const mammoth = require('mammoth');
const PDFDocument = require('pdfkit');

/**
 * Convert DOCX buffer to PDF buffer using mammoth + PDFKit
 */
async function convertDocxToPdf(docxBuffer) {
  return new Promise(async (resolve, reject) => {
    try {
      // Extract text from DOCX
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      const text = result.value;

      // Create PDF
      const chunks = [];
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        size: 'LETTER'
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Parse and add text to PDF
      const lines = text.split('\n');
      let isFirstLine = true;

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) {
          // Simple formatting: detect headers (all caps or short lines)
          if (trimmed.length < 50 && trimmed === trimmed.toUpperCase()) {
            if (!isFirstLine) doc.moveDown(1);
            doc.fontSize(14).font('Helvetica-Bold').text(trimmed);
            doc.moveDown(0.5);
          } else {
            doc.fontSize(11).font('Helvetica').text(trimmed);
            doc.moveDown(0.3);
          }
          isFirstLine = false;
        } else {
          doc.moveDown(0.5);
        }
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    // Only process files in resumes/ folder
    if (!key.startsWith('resumes/')) {
      console.log(`Skipping ${key} - not in resumes folder`);
      continue;
    }

    // Check file extension
    const ext = key.toLowerCase().match(/\.[^.]+$/)?.[0] || '';

    // Skip if already PDF
    if (ext === '.pdf') {
      console.log(`Skipping ${key} - already PDF`);
      continue;
    }

    // Only process DOCX
    if (ext !== '.docx') {
      console.log(`Skipping ${key} - not DOCX (only DOCX supported)`);
      continue;
    }

    try {
      console.log(`Processing ${key} for conversion to PDF`);

      // Download file from S3
      const getObjectParams = {
        Bucket: bucket,
        Key: key
      };

      const s3Object = await s3.getObject(getObjectParams).promise();
      const fileBuffer = Buffer.from(s3Object.Body);

      // Convert DOCX to PDF
      const pdfBuffer = await convertDocxToPdf(fileBuffer);

      // Upload PDF to S3 with .pdf extension
      const pdfKey = key.replace(/\.docx$/i, '.pdf');

      await s3.putObject({
        Bucket: bucket,
        Key: pdfKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        Metadata: {
          'original-file': key,
          'converted-by': 'lambda-converter'
        }
      }).promise();

      console.log(`Successfully converted ${key} to ${pdfKey}`);

      // delete the original DOCX file
      await s3.deleteObject({
        Bucket: bucket,
        Key: key
      }).promise();
      console.log(`Deleted original file ${key}`);

    } catch (error) {
      console.error(`Error processing ${key}:`, error);
      // Continue processing other files even if one fails
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Processing completed',
      processed: event.Records.length
    })
  };
};