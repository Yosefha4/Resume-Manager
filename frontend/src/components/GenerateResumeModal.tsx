import { useState } from 'react';
import { resumeAPI } from '../services/api';
import type { Resume } from '../types';

interface GenerateResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  resumes: Resume[];
}

export const GenerateResumeModal = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  resumes 
}: GenerateResumeModalProps) => {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [baseResumeId, setBaseResumeId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!jobTitle.trim() || !jobDescription.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (jobDescription.trim().length < 50) {
      setError('Job description should be at least 50 characters long');
      return;
    }

    try {
      setLoading(true);
      await resumeAPI.generateResume(jobTitle, jobDescription, baseResumeId);
      onSuccess();
      onClose();
      // Reset form
      setJobTitle('');
      setJobDescription('');
      setBaseResumeId(undefined);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate resume. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setJobTitle('');
      setJobDescription('');
      setBaseResumeId(undefined);
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      ></div>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                ✨ Generate AI-Tailored Resume
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Create a customized resume for a specific job position
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="input-field"
                placeholder="e.g., Senior Full Stack Developer"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="input-field resize-none"
                rows={10}
                placeholder="Paste the full job description here, including requirements, responsibilities, and qualifications..."
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                {jobDescription.length} characters
              </p>
            </div>

            {resumes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Resume (Optional)
                </label>
                <select
                  value={baseResumeId || ''}
                  onChange={(e) => setBaseResumeId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="input-field"
                  disabled={loading}
                >
                  <option value="">Use most recent resume</option>
                  {resumes.map(resume => (
                    <option key={resume.id} value={resume.id}>
                      {resume.title} {resume.version > 1 ? `(v${resume.version})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select which resume to use as the base. If not selected, your most recent resume will be used.
                </p>
              </div>
            )}

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-purple-800">
                  <p className="font-semibold mb-1">How it works:</p>
                  <ul className="list-disc list-inside space-y-1 text-purple-700">
                    <li>The AI will analyze your existing resume to understand your experience and skills</li>
                    <li>It will create a tailored version that highlights relevant qualifications for this position</li>
                    <li>Your actual experience, skills, and education will be preserved - nothing will be invented</li>
                    <li>The generated resume will be saved as a new resume in your dashboard</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !jobTitle.trim() || !jobDescription.trim()}
                className="flex-1 btn-primary bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  '✨ Generate Resume'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

