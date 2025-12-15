# Resume Vers - Frontend

A modern React + TypeScript frontend for the Resume Vers application.

## Features

- 🔐 **Authentication**: Sign up and sign in with JWT token management
- 🛡️ **Protected Routes**: Automatic route protection based on authentication
- 📄 **Resume Management**: Upload, view, and manage resume files
- 🎨 **Modern UI**: Beautiful design with Tailwind CSS
- ⚡ **Fast**: Built with Vite for optimal performance

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the frontend directory:
```env
VITE_API_URL=http://localhost:5000/api
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port Vite assigns).

## Project Structure

```
src/
├── components/       # Reusable components
│   └── ProtectedRoute.tsx
├── context/          # React Context providers
│   └── AuthContext.tsx
├── pages/            # Page components
│   ├── Signup.tsx
│   ├── Signin.tsx
│   └── Dashboard.tsx
├── services/         # API service layer
│   └── api.ts
├── types/            # TypeScript type definitions
│   └── index.ts
├── App.tsx           # Main app component with routing
├── main.tsx          # Entry point
└── index.css         # Global styles with Tailwind
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Authentication Flow

1. User signs up or signs in
2. JWT token is stored in localStorage
3. Token is automatically included in API requests
4. Protected routes check authentication status
5. Unauthenticated users are redirected to sign in

## API Integration

The frontend communicates with the backend API through the `api.ts` service layer. All requests automatically include the JWT token when available.

Make sure your backend server is running on `http://localhost:5000` (or update the `VITE_API_URL` in your `.env` file).
