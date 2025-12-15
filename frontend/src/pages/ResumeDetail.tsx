import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { resumeAPI } from '../services/api';
import { UploadVersionModal } from '../components/UploadVersionModal';
import type { Resume } from '../types';

export const ResumeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [isUploadVersionModalOpen, setIsUploadVersionModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (id) {
      loadResume();
    }
    return () => {
      // Cleanup preview URL on unmount
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [id]);

  useEffect(() => {
    // Load preview when resume or selected version changes
    if (resume) {
      loadPreview(selectedVersion || resume.version);
    }
  }, [resume, selectedVersion]);

  const loadResume = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError('');
      const data = await resumeAPI.getById(parseInt(id));
      setResume(data.resume);
      setEditTitle(data.resume.title);
      setEditDescription(data.resume.description || '');
      setSelectedVersion(null); // Reset to current version
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load resume');
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async (versionNumber: number) => {
    if (!id || !resume) return;

    try {
      setPreviewLoading(true);
      
      // Cleanup previous preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      // Get the version info to check file type
      const versionToPreview = versionNumber === resume.version
        ? resume
        : resume.versions?.find(v => v.version_number === versionNumber);

      if (!versionToPreview) {
        setPreviewUrl(null);
        return;
      }

      // Download the file
      const blob = versionNumber === resume.version
        ? await resumeAPI.download(parseInt(id))
        : await resumeAPI.downloadVersion(parseInt(id), versionNumber);

      // Check if blob is valid (not JSON error response)
      // If blob type is JSON, it's likely an error response - check without consuming the blob
      if (blob.type === 'application/json') {
        // Clone blob to read error without consuming original
        const clonedBlob = blob.slice();
        const text = await clonedBlob.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || 'Failed to download file');
        } catch (e: any) {
          if (e.message && e.message !== 'Failed to download file') {
            throw e;
          }
          // If parsing failed, it's not JSON, continue with original blob
        }
        setPreviewUrl(null);
        return;
      }

      // Check if it's a PDF - check multiple ways (prioritize filename extension)
      const fileName = (versionToPreview.file_name || '').toLowerCase();
      const fileType = (versionToPreview.file_type || '').toLowerCase();
      const blobType = (blob.type || '').toLowerCase();
      
      const isPDF = 
        fileName.endsWith('.pdf') ||  // Most reliable check
        fileType.includes('pdf') || 
        blobType === 'application/pdf';

      if (isPDF) {
        // Create object URL for PDF preview
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } else {
        // For DOC files, we can't preview directly, so set to null
        setPreviewUrl(null);
      }
    } catch (err: any) {
      console.error('Failed to load preview:', err);
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id || !resume) return;

    try {
      setSaving(true);
      setError('');
      const data = await resumeAPI.update(parseInt(id), editTitle.trim(), editDescription.trim() || undefined);
      setResume(data.resume);
      setEditTitle(data.resume.title);
      setEditDescription(data.resume.description || '');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update resume');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (resume) {
      setEditTitle(resume.title);
      setEditDescription(resume.description || '');
    }
    setIsEditing(false);
    setError('');
  };

  const handleDelete = async () => {
    if (!id) return;
    
    if (!window.confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      return;
    }

    try {
      await resumeAPI.delete(parseInt(id));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete resume');
    }
  };

  const handleDownload = async () => {
    if (!id || !resume) return;

    try {
      const blob = await resumeAPI.download(parseInt(id));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resume.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download resume');
    }
  };

  const handleDownloadVersion = async (versionNumber: number, fileName: string) => {
    if (!id) return;

    try {
      const blob = await resumeAPI.downloadVersion(parseInt(id), versionNumber);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download version');
    }
  };

  const handleVersionClick = (versionNumber: number) => {
    setSelectedVersion(versionNumber);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if current preview is PDF - check multiple ways
  const currentVersion = selectedVersion 
    ? resume?.versions?.find(v => v.version_number === selectedVersion)
    : resume;
  
  const isPDF = currentVersion 
    ? (currentVersion.file_type?.toLowerCase().includes('pdf') || 
       currentVersion.file_name?.toLowerCase().endsWith('.pdf') ||
       false)
    : (resume?.file_type?.toLowerCase().includes('pdf') || 
       resume?.file_name?.toLowerCase().endsWith('.pdf') ||
       false);
  
  const currentPreviewVersion = selectedVersion || resume?.version || 1;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Resume not found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary mt-4"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsUploadVersionModalOpen(true)}
                    className="btn-primary"
                  >
                    Upload New Version
                  </button>
                  <button
                    onClick={handleDownload}
                    className="btn-secondary"
                  >
                    Download Current
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !editTitle.trim()}
                    className="btn-primary disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar - Resume Details */}
        <aside className="w-full lg:w-96 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Title Section */}
            <div>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="input-field"
                      placeholder="Resume title"
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="input-field resize-none"
                      rows={4}
                      placeholder="Add a description for this resume..."
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <h1 className="text-2xl font-bold text-gray-900 pr-4">{resume.title}</h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                  {resume.description && (
                    <p className="text-gray-600 text-sm">{resume.description}</p>
                  )}
                </div>
              )}
            </div>

            {/* Version Badge & Info */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                Version {resume.version}
              </span>
              <span className="text-sm text-gray-500">
                {isPDF ? 'PDF' : 'DOC'}
              </span>
              <button
                onClick={handleDelete}
                className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors text-sm font-medium"
              >
                Delete
              </button>
            </div>

            {/* File Information */}
            <div className="space-y-3 pb-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">File Information</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-500">File Name</p>
                  <p className="text-gray-900 font-medium truncate">{resume.file_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">File Size</p>
                  <p className="text-gray-900 font-medium">{formatFileSize(resume.file_size)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="text-gray-900 font-medium">{formatDate(resume.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Updated</p>
                  <p className="text-gray-900 font-medium">{formatDate(resume.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Version History */}
            {resume.versions && resume.versions.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Version History</h3>
                  <span className="text-xs text-gray-500">
                    {resume.versions.length} version{resume.versions.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {resume.versions.map((version) => (
                    <button
                      key={version.id}
                      onClick={() => handleVersionClick(version.version_number)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        version.version_number === currentPreviewVersion
                          ? 'bg-primary-50 border-primary-300 shadow-sm'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              version.version_number === resume.version
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            v{version.version_number}
                            {version.version_number === resume.version && (
                              <span className="ml-1 text-xs">(Current)</span>
                            )}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadVersion(version.version_number, version.file_name);
                          }}
                          className="text-gray-400 hover:text-primary-600 transition-colors"
                          title="Download"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 truncate">{version.file_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(version.file_size)} • {new Date(version.created_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Info Note */}
            <div className="bg-primary-50 rounded-lg p-3">
              <p className="text-xs text-primary-800">
                <strong>Tip:</strong> Click on any version to preview it. Download to edit locally, then upload as a new version.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Preview Area */}
        <main className="flex-1 bg-gray-100 overflow-hidden flex flex-col">
          {previewLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading preview...</p>
              </div>
            </div>
          ) : previewUrl && isPDF ? (
            <div className="flex-1 flex flex-col">
              {/* Preview Header */}
              <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    Preview: Version {currentPreviewVersion}
                  </span>
                  {selectedVersion && selectedVersion !== resume.version && (
                    <span className="text-xs text-gray-500">(Not current)</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (selectedVersion) {
                      const version = resume.versions?.find(v => v.version_number === selectedVersion);
                      if (version) {
                        handleDownloadVersion(selectedVersion, version.file_name);
                      }
                    } else {
                      handleDownload();
                    }
                  }}
                  className="btn-secondary text-sm px-3 py-1"
                >
                  Download
                </button>
              </div>
              {/* PDF Preview */}
              <div className="flex-1 overflow-hidden">
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Resume Preview"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="mb-6">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Preview Not Available
                </h3>
                <p className="text-gray-600 mb-6">
                  {isPDF
                    ? 'Unable to load PDF preview. Please download the file to view it.'
                    : 'DOC and DOCX files cannot be previewed in the browser. Please download the file to view it.'}
                </p>
                <button
                  onClick={handleDownload}
                  className="btn-primary"
                >
                  Download to View
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Upload Version Modal */}
      {resume && (
        <UploadVersionModal
          isOpen={isUploadVersionModalOpen}
          onClose={() => setIsUploadVersionModalOpen(false)}
          onSuccess={loadResume}
          resumeId={resume.id}
          currentVersion={resume.version}
        />
      )}
    </div>
  );
};
