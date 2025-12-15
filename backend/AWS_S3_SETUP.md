# AWS S3 Setup Guide

This guide explains how to configure AWS S3 for file storage in Resume-Vers.

## Overview

The application supports two storage modes:
1. **AWS S3** (Cloud storage) - Recommended for production
2. **Local storage** (Default) - Files stored in `backend/uploads/` directory

The system automatically detects which mode to use based on your environment variables.

## Prerequisites

- AWS Account
- AWS S3 bucket created
- IAM user with S3 permissions

## Step 1: Create S3 Bucket

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **S3** service
3. Click **Create bucket**
4. Configure:
   - **Bucket name**: Choose a unique name (e.g., `resume-vers-files`)
   - **Region**: Choose your preferred region (e.g., `us-east-1`)
   - **Block Public Access**: Keep enabled for security
   - **Versioning**: Optional (recommended for production)
   - **Encryption**: Enable server-side encryption (recommended)
5. Click **Create bucket**

## Step 2: Create IAM User

1. Navigate to **IAM** service in AWS Console
2. Click **Users** → **Create user**
3. Enter username (e.g., `resume-vers-s3-user`)
4. Select **Programmatic access**
5. Click **Next: Permissions**
6. Click **Attach policies directly**
7. Create a custom policy with this JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name"
    }
  ]
}
```

Replace `your-bucket-name` with your actual bucket name.

8. Click **Next** → **Create user**
9. **IMPORTANT**: Save the **Access Key ID** and **Secret Access Key** (you won't see the secret again!)

## Step 3: Configure Environment Variables

Add these to your `.env` file:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=resume-vers-files
```

Replace with your actual values:
- `AWS_REGION`: The region where your bucket is located
- `AWS_ACCESS_KEY_ID`: From Step 2
- `AWS_SECRET_ACCESS_KEY`: From Step 2
- `AWS_S3_BUCKET_NAME`: Your bucket name from Step 1

## Step 4: Install Dependencies

The required packages are already in `package.json`. Just run:

```bash
npm install
```

This will install:
- `@aws-sdk/client-s3` - AWS SDK for S3 operations
- `@aws-sdk/s3-request-presigner` - For generating signed URLs
- `multer-s3` - Multer storage engine for S3

## Step 5: Test the Setup

1. Start your server:
```bash
npm run dev
```

2. Upload a resume file through the API or frontend
3. Check your S3 bucket - you should see files in the `resumes/` folder

## How It Works

### Upload Flow
1. File is uploaded via API
2. System checks for AWS credentials
3. If found → Upload to S3 bucket
4. If not found → Save to local `uploads/` directory
5. Store metadata (including S3 key or local path) in database

### Download Flow
1. User requests file download
2. System checks storage type from file_path
3. **S3**: Generate signed URL (expires in 1 hour) and redirect
4. **Local**: Stream file directly from filesystem

### Delete Flow
1. User deletes resume
2. Delete database record
3. **S3**: Delete object from S3 bucket
4. **Local**: Delete file from filesystem

## File Structure in S3

Files are stored with this structure:
```
your-bucket/
  └── resumes/
      ├── MyResume-1763984897045-286571665.pdf
      ├── CV-1763983945713-185437734.docx
      └── ...
```

## Security Best Practices

1. **Never commit credentials** - Keep `.env` file in `.gitignore`
2. **Use IAM roles** - For production (EC2, ECS, Lambda)
3. **Rotate keys regularly** - Change access keys every 90 days
4. **Enable encryption** - Use SSE-S3 or SSE-KMS
5. **Restrict bucket policy** - Only allow necessary operations
6. **Use CloudTrail** - Enable logging for audit trails

## Cost Considerations

AWS S3 pricing (approximate):
- **Storage**: $0.023 per GB/month (Standard storage)
- **PUT requests**: $0.005 per 1,000 requests
- **GET requests**: $0.0004 per 1,000 requests
- **Data transfer**: Varies by region

For a small application with ~1000 files:
- Storage: ~$0.50/month (assuming 20GB)
- Requests: ~$0.10/month
- **Total**: ~$0.60/month

## Troubleshooting

### Error: "Access Denied"
- Check IAM user permissions
- Verify bucket name is correct
- Ensure bucket policy allows operations

### Error: "Bucket not found"
- Verify bucket name in `.env`
- Check bucket exists in the specified region
- Ensure region matches bucket location

### Files not uploading
- Check AWS credentials are correct
- Verify network connectivity
- Check S3 bucket permissions

### Files uploading but not downloading
- Verify signed URL generation
- Check IAM permissions include `s3:GetObject`
- Ensure bucket is accessible

## Migration from Local to S3

If you have existing local files:

1. Keep local storage running
2. Set up S3 configuration
3. Create migration script to upload existing files
4. Update database `file_path` values to S3 keys
5. Test thoroughly
6. Remove local files after verification

## Disabling S3

To switch back to local storage:
1. Remove or comment out AWS environment variables
2. Restart the server
3. New uploads will use local storage
4. Existing S3 files will still be accessible (if keys are in database)

## Support

For AWS S3 documentation:
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)

