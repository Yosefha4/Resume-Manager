# Resume Vers

A full-stack web application for managing multiple versions of your resume with AI-powered resume generation tailored to specific job descriptions.

## 🎯 Overview

Resume Vers is a modern, secure platform that helps professionals manage their resume versions efficiently. Upload your resume, create multiple versions for different job applications, and leverage AI to generate tailored resumes based on job descriptions.

## ✨ Key Features

### 🔐 Authentication & Security
- **User Authentication**: Secure sign up and sign in with JWT tokens
- **Protected Routes**: All resume operations require authentication
- **User Isolation**: Users can only access their own resumes and versions
- **Password Security**: Bcrypt hashing for secure password storage

### 📄 Resume Management
- **Upload Resumes**: Support for PDF, DOC, and DOCX files (up to 10MB)
- **Resume Organization**: Add titles and descriptions to organize your resumes
- **View & Download**: Access and download your resumes anytime
- **Update Metadata**: Edit resume titles and descriptions
- **Delete Resumes**: Remove resumes you no longer need

### 🔄 Version Control
- **Multiple Versions**: Create and manage multiple versions of each resume
- **Version History**: Track all versions with version numbers and timestamps
- **Version Comparison**: View and compare different versions of your resume
- **Version Downloads**: Download any specific version

### 🤖 AI-Powered Resume Generation
- **Job-Specific Resumes**: Generate tailored resumes based on job descriptions
- **Intelligent Parsing**: Extract structured data from existing resumes (PDF/DOCX)
- **Smart Tailoring**: AI analyzes job requirements and customizes your resume
- **Base Resume Selection**: Choose which resume to use as a base for generation
- **OpenAI Integration**: Powered by GPT-4o-mini for cost-effective generation

### ☁️ Flexible Storage
- **AWS S3 Support**: Store files in AWS S3 for scalable cloud storage
- **Local Storage**: Fallback to local file storage if S3 is not configured
- **Automatic Detection**: System automatically uses S3 if credentials are provided

### 🎨 Modern UI
- **Beautiful Design**: Clean, modern interface built with Tailwind CSS
- **Responsive Layout**: Works seamlessly on desktop and mobile devices
- **Fast Performance**: Built with Vite for optimal loading speeds
- **Intuitive Navigation**: Easy-to-use dashboard and navigation

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API requests

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type-safe development
- **PostgreSQL** - Relational database
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **AWS SDK** - S3 integration
- **OpenAI API** - AI resume generation
- **pdf-parse** - PDF text extraction
- **mammoth** - DOCX text extraction
- **docx** - DOCX file generation

## 📁 Project Structure

```
Resume-Vers/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── db/             # Database connection and migrations
│   │   ├── middleware/     # Auth and upload middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic (AI, S3, parsing)
│   │   └── server.ts       # Express server setup
│   ├── uploads/            # Local file storage (gitignored)
│   ├── package.json
│   └── README.md           # Backend-specific documentation
│
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── context/        # React Context providers
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── types/          # TypeScript definitions
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   ├── package.json
│   └── README.md           # Frontend-specific documentation
│
└── README.md               # This file
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v12 or higher)
- **Git**

Optional (for advanced features):
- **AWS Account** (for S3 storage)
- **OpenAI API Key** (for AI resume generation)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Resume-Vers
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `backend/.env` with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=resume_vers
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secret (use a strong random string)
JWT_SECRET=your-super-secret-jwt-key

# Server Port
PORT=5000

# AWS S3 Configuration (Optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name

# OpenAI API Key (Optional - for AI features)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

Initialize the database:

```bash
npm run init-db
npm run migrate-versions
```

Start the backend server:

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The backend will be available at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port Vite assigns)

## 🎮 Usage

### Getting Started

1. **Sign Up**: Create a new account with your email and password
2. **Sign In**: Log in to access your dashboard
3. **Upload Resume**: Click "Upload Resume" to add your first resume
4. **Manage Versions**: Create new versions or upload updated versions
5. **AI Generation**: Use "AI Generate Resume" to create job-specific resumes

### Creating Versions

1. Navigate to a resume's detail page
2. Click "Upload New Version"
3. Select your updated resume file
4. The system automatically increments the version number

### AI Resume Generation

1. Click "✨ AI Generate Resume" on the dashboard
2. Enter the job title and job description
3. Optionally select a base resume (defaults to most recent)
4. Click "Generate Resume"
5. The AI will create a tailored resume based on the job description
6. Download the generated resume

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Sign in with credentials
- `GET /api/auth/me` - Get current user info (requires auth)

### Resumes

All resume endpoints require authentication via JWT token in the `Authorization` header.

- `GET /api/resumes` - Get all resumes for authenticated user
- `GET /api/resumes/:id` - Get specific resume
- `POST /api/resumes` - Upload new resume
- `PUT /api/resumes/:id` - Update resume metadata
- `DELETE /api/resumes/:id` - Delete resume
- `GET /api/resumes/:id/download` - Download resume file
- `POST /api/resumes/generate` - Generate AI-tailored resume
- `GET /api/resumes/:id/versions` - Get all versions of a resume
- `POST /api/resumes/:id/versions` - Upload new version
- `GET /api/resumes/:id/versions/:versionNumber/download` - Download specific version

## 🗄️ Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email address
- `password` - Hashed password (bcrypt)
- `name` - User's name (optional)
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Resumes Table
- `id` - Primary key
- `user_id` - Foreign key to users table
- `title` - Resume title
- `file_name` - Original file name
- `file_path` - Path to stored file
- `file_size` - File size in bytes
- `file_type` - MIME type
- `description` - Optional description
- `version` - Current version number
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Resume Versions Table
- `id` - Primary key
- `resume_id` - Foreign key to resumes table
- `version_number` - Version number
- `file_name` - Version file name
- `file_path` - Path to version file
- `file_size` - File size in bytes
- `file_type` - MIME type
- `created_at` - Timestamp

## ⚙️ Configuration

### AWS S3 Setup

For cloud storage, configure AWS S3:

1. Create an S3 bucket in your AWS account
2. Set up IAM user with S3 permissions (see `backend/AWS_S3_SETUP.md`)
3. Add credentials to `backend/.env`
4. Files will automatically be stored in S3

If S3 is not configured, files are stored locally in `backend/uploads/`

### OpenAI Setup

For AI resume generation:

1. Get an OpenAI API key from https://platform.openai.com/
2. Add `OPENAI_API_KEY` to `backend/.env`
3. Ensure you have credits in your OpenAI account
4. See `backend/AI_SETUP.md` for detailed setup instructions

**Cost**: Approximately $0.01 - $0.03 per resume generation using GPT-4o-mini

## 🔒 Security Features

- **Password Hashing**: Bcrypt with salt rounds
- **JWT Authentication**: Stateless token-based auth (7-day expiration)
- **User Isolation**: Database queries filtered by user ID
- **File Validation**: Type and size validation for uploads
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Controlled cross-origin requests

## 🧪 Development

### Backend Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start           # Start production server
npm run init-db     # Initialize database tables
npm run migrate      # Run database migrations
npm run migrate-versions  # Initialize version system
npm run lint         # Run ESLint
```

### Frontend Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 📝 Environment Variables

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_HOST` | PostgreSQL host | Yes |
| `DB_PORT` | PostgreSQL port | Yes |
| `DB_NAME` | Database name | Yes |
| `DB_USER` | Database user | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `PORT` | Server port | No (default: 5000) |
| `AWS_REGION` | AWS region | No |
| `AWS_ACCESS_KEY_ID` | AWS access key | No |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | No |
| `AWS_S3_BUCKET_NAME` | S3 bucket name | No |
| `OPENAI_API_KEY` | OpenAI API key | No |

### Frontend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |

## 🐛 Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists: `CREATE DATABASE resume_vers;`

### File Upload Issues
- Check file size (max 10MB)
- Verify file type (PDF, DOC, DOCX only)
- Check S3 permissions if using AWS
- Verify `uploads/` directory exists (for local storage)

### AI Generation Issues
- Verify OpenAI API key is set
- Check OpenAI account has credits
- Ensure base resume file is readable
- Check API rate limits

### Version System Issues
- Run `npm run migrate-versions` in backend
- Verify `resume_versions` table exists
- Check database migrations completed

## 📚 Additional Documentation

- [Backend README](backend/README.md) - Detailed backend documentation
- [Frontend README](frontend/README.md) - Detailed frontend documentation
- [AWS S3 Setup](backend/AWS_S3_SETUP.md) - S3 configuration guide
- [AI Setup](backend/AI_SETUP.md) - OpenAI configuration guide
- [IAM Permissions](backend/FIX_IAM_PERMISSIONS.md) - AWS IAM setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC

## 🙏 Acknowledgments

- Built with React, Express, and PostgreSQL
- AI powered by OpenAI
- File storage with AWS S3
- UI styled with Tailwind CSS

---

**Made with ❤️ for professionals managing their career journey**

