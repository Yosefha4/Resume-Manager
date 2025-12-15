# Fix IAM Permissions for S3 Access

## Current Issue
Your IAM user `resume-app-user` doesn't have permission to upload files to S3.

## Quick Fix Steps

### Option 1: Attach Policy via AWS Console (Easiest)

1. **Go to AWS IAM Console**
   - Navigate to: https://console.aws.amazon.com/iam/
   - Click on **Users** in the left sidebar
   - Find and click on `resume-app-user`

2. **Add Permissions**
   - Click the **Add permissions** button
   - Select **Attach policies directly**
   - Click **Create policy**

3. **Create Custom Policy**
   - Click **JSON** tab
   - Copy and paste this policy:

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
      "Resource": "arn:aws:s3:::resume-ai-files/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::resume-ai-files"
    }
  ]
}
```

4. **Save Policy**
   - Click **Next**
   - Name it: `ResumeAppS3Access`
   - Add description: "Allows Resume App to upload, download, and delete files from S3"
   - Click **Create policy**

5. **Attach Policy to User**
   - Go back to the `resume-app-user` page
   - Click **Add permissions** → **Attach policies directly**
   - Search for `ResumeAppS3Access`
   - Check the box and click **Add permissions**

### Option 2: Use AWS CLI

If you have AWS CLI configured:

```bash
aws iam put-user-policy \
  --user-name resume-app-user \
  --policy-name ResumeAppS3Access \
  --policy-document file://IAM_POLICY.json
```

### Option 3: Update Existing Policy

If you already have a policy attached:

1. Go to IAM → Users → `resume-app-user`
2. Click on the policy name
3. Click **Edit policy**
4. Click **JSON** tab
5. Add these permissions to the existing policy:

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:GetObject",
    "s3:DeleteObject"
  ],
  "Resource": "arn:aws:s3:::resume-ai-files/*"
}
```

And:

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:ListBucket"
  ],
  "Resource": "arn:aws:s3:::resume-ai-files"
}
```

## Verify Permissions

After updating, wait a few seconds for changes to propagate, then test the upload again.

## Required Permissions Summary

Your IAM user needs these permissions:

| Permission | Resource | Purpose |
|------------|----------|---------|
| `s3:PutObject` | `arn:aws:s3:::resume-ai-files/*` | Upload files |
| `s3:GetObject` | `arn:aws:s3:::resume-ai-files/*` | Download files (signed URLs) |
| `s3:DeleteObject` | `arn:aws:s3:::resume-ai-files/*` | Delete files |
| `s3:ListBucket` | `arn:aws:s3:::resume-ai-files` | List bucket contents |

## Important Notes

- Replace `resume-ai-files` with your actual bucket name if different
- The `/*` at the end of the bucket ARN is important - it means "all objects in the bucket"
- Without `/*`, it refers to the bucket itself (needed for ListBucket)
- Changes may take a few seconds to propagate

## Test After Fixing

1. Restart your backend server
2. Try uploading a resume file
3. Check your S3 bucket - you should see the file in the `resumes/` folder

