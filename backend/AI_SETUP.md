# AI Resume Generation Setup

This guide will help you set up the AI resume generation feature.

## Prerequisites

1. **OpenAI API Key**: You need an OpenAI API account and API key
   - Sign up at https://platform.openai.com/
   - Create an API key in your account settings
   - Make sure you have credits in your account

## Setup Steps

### 1. Add OpenAI API Key to Environment Variables

Add the following to your `backend/.env` file:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Important**: Never commit your API key to version control. Make sure `.env` is in your `.gitignore`.

### 2. Verify Installation

Make sure all required packages are installed:

```bash
cd backend
npm install
```

Required packages:
- `openai` - OpenAI API client
- `pdf-parse` - PDF text extraction
- `mammoth` - DOCX text extraction
- `docx` - DOCX file generation

### 3. Test the Feature

1. Start your backend server:
   ```bash
   npm run dev
   ```

2. In the frontend dashboard, click the "✨ AI Generate Resume" button

3. Fill in:
   - Job Title (e.g., "Senior Full Stack Developer")
   - Job Description (paste the full job posting)
   - Optionally select a base resume

4. Click "Generate Resume"

## How It Works

1. **Text Extraction**: The system extracts text from your existing resume (PDF or DOCX)
2. **Data Extraction**: AI analyzes the text and extracts structured data (experience, skills, education)
3. **Resume Generation**: AI creates a tailored resume based on the job description
4. **File Creation**: The tailored resume is saved as a new DOCX file
5. **Storage**: The file is saved to S3 (if configured) or local storage

## Cost Considerations

- **Model Used**: GPT-4o-mini (cost-effective option)
- **Approximate Cost**: $0.01 - $0.03 per resume generation
- **Rate Limits**: OpenAI has rate limits based on your account tier

## Troubleshooting

### Error: "Failed to analyze resume. Please check your OpenAI API key."

- Verify your API key is correct in `.env`
- Check that you have credits in your OpenAI account
- Ensure the API key has proper permissions

### Error: "Failed to extract text from resume file"

- Make sure the resume file is readable
- Check that the file is not corrupted
- Verify the file format is supported (PDF or DOCX)

### Error: "No resume found to use as base"

- Upload at least one resume before using AI generation
- The system needs an existing resume to use as a base

## API Endpoint

**POST** `/api/resumes/generate`

**Request Body:**
```json
{
  "jobTitle": "Senior Full Stack Developer",
  "jobDescription": "Full job description here...",
  "baseResumeId": 1  // Optional
}
```

**Response:**
```json
{
  "message": "AI-generated resume created successfully",
  "resume": {
    "id": 10,
    "title": "Senior Full Stack Developer - AI Tailored",
    "file_name": "senior-full-stack-developer-1234567890.docx",
    ...
  }
}
```

## Security Notes

- API keys are stored in environment variables (never in code)
- All requests require authentication
- Users can only generate resumes from their own resumes
- Generated resumes are stored with the same security as uploaded resumes

