// User types
export interface User {
  id: number;
  email: string;
  password?: string; // Optional in responses (should not be returned)
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string | null;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string | null;
  created_at: Date;
}

// Resume types
export interface Resume {
  id: number;
  user_id: number;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateResumeInput {
  user_id: number;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  description?: string | null;
}

export interface UpdateResumeInput {
  title?: string;
  description?: string | null;
}

export interface ResumeResponse {
  id: number;
  title: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

// Resume Version types
export interface ResumeVersion {
  id: number;
  resume_id: number;
  version_number: number;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  created_at: Date;
}

export interface CreateResumeVersionInput {
  resume_id: number;
  version_number: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
}

export interface ResumeWithVersions extends ResumeResponse {
  versions: ResumeVersion[];
  current_version: ResumeVersion | null;
}

