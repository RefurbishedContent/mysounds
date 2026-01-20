import React, { useState, useRef } from 'react';
import { Upload, Music, X, AlertCircle, CheckCircle, FileAudio } from 'lucide-react';
import { storageService, UploadResult } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';

interface LibraryUploaderProps {
  onUploadComplete: (upload: UploadResult) => void;
}

const LibraryUploader: React.FC<LibraryUploaderProps> = ({ onUploadComplete }) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SUPPORTED_FORMATS = ['.mp3', '.wav', '.flac', '.m4a', '.aac'];
  const MAX_FILE_SIZE = 100 * 1024 * 1024;

  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_FORMATS.includes(extension)) {
      return `${file.name}: Unsupported format. Use ${SUPPORTED_FORMATS.join(', ')}`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File too large. Max 100MB.`;
    }

    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const validFiles: File[] = [];
    let errors: string[] = [];

    selectedFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
    } else {
      setError(null);
    }

    setFiles(prev => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (files.length === 1) {
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!user) {
      setError('You must be signed in to upload files');
      return;
    }

    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the copyright terms');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      for (const file of files) {
        const uploadResult = await storageService.uploadAudioFile(
          file,
          user.id,
          (progress) => {
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
          }
        );

        onUploadComplete(uploadResult);
      }

      setFiles([]);
      setUploadProgress({});
      setAgreedToTerms(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload files';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white">Add Songs to Your Library</h3>
        <p className="text-gray-400 text-sm">
          Upload audio files to build your music collection. You can upload multiple files at once.
        </p>
        <p className="text-xs text-gray-500">
          Supports: {SUPPORTED_FORMATS.join(', ')} • Max 100MB per file
        </p>
      </div>

      {/* File Selection */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_FORMATS.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {files.length === 0 ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-48 border-2 border-dashed border-gray-600 hover:border-cyan-500 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-all duration-200 flex flex-col items-center justify-center space-y-3 group"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-600/20 to-purple-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold mb-1">Click to upload songs</p>
              <p className="text-gray-400 text-sm">or drag and drop files here</p>
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center space-x-4 bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <div className="w-10 h-10 bg-cyan-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileAudio className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{file.name}</p>
                  <p className="text-gray-400 text-sm">{formatFileSize(file.size)}</p>
                  {uploading && uploadProgress[file.name] !== undefined && (
                    <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-600 to-blue-600 transition-all duration-300"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      />
                    </div>
                  )}
                </div>
                {!uploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}

            {!uploading && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-gray-600 hover:border-cyan-500 rounded-lg text-cyan-400 hover:text-cyan-300 font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Upload size={18} />
                <span>Add More Files</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Copyright Agreement */}
      {files.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-4">
          <div className="space-y-3">
            <h4 className="text-white font-semibold flex items-center space-x-2">
              <AlertCircle size={18} className="text-yellow-500" />
              <span>Copyright & Legal Agreement</span>
            </h4>
            <div className="text-sm text-gray-300 space-y-2 max-h-48 overflow-y-auto bg-gray-900/50 rounded-lg p-4">
              <p>By uploading files to this platform, you confirm and agree that:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>You own the copyright to these audio files OR have obtained proper authorization from the copyright holder(s) to use and upload these files.</li>
                <li>You will not upload any copyrighted material without proper permission, license, or legal right to do so.</li>
                <li>You accept full legal responsibility for any copyright infringement or violations that may result from your uploads.</li>
                <li>You agree to indemnify and hold harmless MySounds.ai, its operators, and affiliates from any legal claims, damages, or liabilities arising from your uploaded content.</li>
                <li>You understand that unauthorized use of copyrighted material may result in legal action, account termination, and removal of your content.</li>
                <li>You grant MySounds.ai a limited, non-exclusive license to process and store your uploaded files solely for the purpose of providing the service to you.</li>
              </ul>
            </div>
          </div>

          <label className="flex items-start space-x-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
              I have read and agree to these terms. I confirm that I have the legal right to upload these files and accept full responsibility for any copyright violations.
            </span>
          </label>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start space-x-3 p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <AlertCircle size={20} className="flex-shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300 mb-1">Error</p>
            <p className="text-sm text-red-200 whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-400">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </p>
          <button
            onClick={handleUpload}
            disabled={uploading || !agreedToTerms}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:via-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg"
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <CheckCircle size={20} />
                <span>Upload to Library</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default LibraryUploader;
