export interface User {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface Resume {
  id: number;
  title: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  versions?: ResumeVersion[];
  current_version?: ResumeVersion | null;
}

export interface ResumeVersion {
  id: number;
  version_number: number;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

export interface ResumesResponse {
  resumes: Resume[];
}

export interface VersionsResponse {
  versions: ResumeVersion[];
}

