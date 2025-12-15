import axios from 'axios';
import type { AuthResponse, User, Resume, ResumesResponse, ResumeVersion, VersionsResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: async (email: string, password: string, name?: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/signup', {
      email,
      password,
      name,
    });
    return response.data;
  },

  signin: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/signin', {
      email,
      password,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await api.get<{ user: User }>('/auth/me');
    return response.data;
  },
};

// Resume API
export const resumeAPI = {
  getAll: async (): Promise<ResumesResponse> => {
    const response = await api.get<ResumesResponse>('/resumes');
    return response.data;
  },

  getById: async (id: number): Promise<{ resume: Resume }> => {
    const response = await api.get<{ resume: Resume }>(`/resumes/${id}`);
    return response.data;
  },

  upload: async (file: File, title: string, description?: string): Promise<{ message: string; resume: Resume }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (description) {
      formData.append('description', description);
    }

    const response = await api.post<{ message: string; resume: Resume }>('/resumes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  update: async (id: number, title?: string, description?: string): Promise<{ message: string; resume: Resume }> => {
    const response = await api.put<{ message: string; resume: Resume }>(`/resumes/${id}`, {
      title,
      description,
    });
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/resumes/${id}`);
    return response.data;
  },

  download: async (id: number): Promise<Blob> => {
    const response = await api.get(`/resumes/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Version management
  uploadVersion: async (id: number, file: File): Promise<{ message: string; version: ResumeVersion }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ message: string; version: ResumeVersion }>(`/resumes/${id}/versions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getVersions: async (id: number): Promise<VersionsResponse> => {
    const response = await api.get<VersionsResponse>(`/resumes/${id}/versions`);
    return response.data;
  },

  downloadVersion: async (id: number, versionNumber: number): Promise<Blob> => {
    const response = await api.get(`/resumes/${id}/versions/${versionNumber}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // AI Resume Generation
  generateResume: async (
    jobTitle: string, 
    jobDescription: string, 
    baseResumeId?: number
  ): Promise<{ message: string; resume: Resume }> => {
    const response = await api.post<{ message: string; resume: Resume }>('/resumes/generate', {
      jobTitle,
      jobDescription,
      baseResumeId,
    });
    return response.data;
  },
};

export default api;

