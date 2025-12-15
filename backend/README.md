# Resume-Vers Backend API

A TypeScript-based Node.js backend API for managing resume files with full authentication and authorization.

## Features

- 🔐 **Authentication System**: Sign up, sign in, and JWT-based token authentication
- 📄 **Resume Management**: Upload, view, update, and delete resume files
- 🛡️ **Protected Routes**: All resume operations require authentication
- 📁 **File Upload**: Support for PDF and DOC/DOCX files (up to 10MB)
- 🗄️ **PostgreSQL Database**: Robust data storage with proper relationships
- 🔒 **User Isolation**: Users can only access their own resumes

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update the `.env` file with your database credentials and JWT secret:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=resume_vers
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key
PORT=5000

# AWS S3 Configuration (Optional - if not set, files will be stored locally)
# AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your-aws-access-key-id
# AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
# AWS_S3_BUCKET_NAME=your-bucket-name
```

4. Initialize the database:
```bash
npm run init-db
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:5000` (or the port specified in your `.env` file).

## API Endpoints

### Authentication

#### POST `/api/auth/signup`
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe" // optional
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST `/api/auth/signin`
Sign in with existing credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Sign in successful",
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### GET `/api/auth/me`
Get current user information (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Resumes (All routes require authentication)

#### GET `/api/resumes`
Get all resumes for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "resumes": [
    {
      "id": 1,
      "title": "Software Engineer Resume",
      "file_name": "resume.pdf",
      "file_size": 102400,
      "file_type": "application/pdf",
      "description": "My professional resume",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET `/api/resumes/:id`
Get a specific resume by ID.

**Headers:**
```
Authorization: Bearer <token>
```

#### POST `/api/resumes`
Upload a new resume file.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: The resume file (PDF, DOC, or DOCX, max 10MB)
- `title`: Resume title (required)
- `description`: Resume description (optional)

**Response:**
```json
{
  "message": "Resume uploaded successfully",
  "resume": {
    "id": 1,
    "title": "Software Engineer Resume",
    "file_name": "resume.pdf",
    "file_size": 102400,
    "file_type": "application/pdf",
    "description": "My professional resume",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT `/api/resumes/:id`
Update resume metadata (title and/or description).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Updated Resume Title", // optional
  "description": "Updated description" // optional
}
```

#### DELETE `/api/resumes/:id`
Delete a resume and its file.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Resume deleted successfully"
}
```

#### GET `/api/resumes/:id/download`
Download a resume file.

**Headers:**
```
Authorization: Bearer <token>
```

## Authentication

All resume endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Tokens expire after 7 days. Users can only access their own resumes - the system automatically filters by user ID.

## File Upload

- **Supported formats**: PDF, DOC, DOCX
- **Maximum file size**: 10MB
- **Storage**: 
  - **AWS S3** (if configured): Files are stored in your S3 bucket under `resumes/` folder
  - **Local** (default): Files are stored in the `uploads/` directory
- **File naming**: Files are renamed with a unique timestamp to prevent conflicts
- **Auto-detection**: The system automatically uses S3 if AWS credentials are provided, otherwise falls back to local storage

## Database Schema

### Users Table
- `id`: Primary key
- `email`: Unique email address
- `password`: Hashed password (bcrypt)
- `name`: User's name (optional)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Resumes Table
- `id`: Primary key
- `user_id`: Foreign key to users table
- `title`: Resume title
- `file_name`: Original file name
- `file_path`: Path to stored file
- `file_size`: File size in bytes
- `file_type`: MIME type
- `description`: Optional description
- `created_at`: Timestamp
- `updated_at`: Timestamp

## Security Features

- Passwords are hashed using bcrypt
- JWT tokens for stateless authentication
- User isolation - users can only access their own data
- File type validation
- File size limits
- SQL injection protection (parameterized queries)

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

Error responses follow this format:
```json
{
  "error": "Error message here"
}
```

## Development

### Project Structure
```
backend/
├── src/
│   ├── db/
│   │   ├── index.ts          # Database connection
│   │   └── init.ts           # Database initialization
│   ├── middleware/
│   │   ├── auth.ts           # Authentication middleware
│   │   └── upload.ts         # File upload configuration
│   ├── routes/
│   │   ├── auth.ts           # Authentication routes
│   │   └── resumes.ts        # Resume management routes
│   └── server.ts             # Express server setup
├── uploads/                  # Uploaded files (gitignored)
├── .env                      # Environment variables (gitignored)
├── .env.example              # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## License

ISC

