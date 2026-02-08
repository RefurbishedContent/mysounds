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
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs text-gray-400">
          Upload audio files to your collection. Multiple files supported.
        </p>
        <p className="text-[11px] text-gray-500">
          {SUPPORTED_FORMATS.join(', ')} | Max 100MB per file
        </p>
      </div>

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
            className="w-full h-32 border-2 border-dashed border-gray-600 hover:border-cyan-500 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-all duration-200 flex flex-col items-center justify-center space-y-2 group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium text-sm">Click to upload songs</p>
              <p className="text-gray-400 text-xs">or drag and drop files here</p>
            </div>
          </button>
        ) : (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-gray-800 rounded-lg p-3 border border-gray-700"
              >
                <div className="w-8 h-8 bg-cyan-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileAudio className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-xs truncate">{file.name}</p>
                  <p className="text-gray-400 text-[11px]">{formatFileSize(file.size)}</p>
                  {uploading && uploadProgress[file.name] !== undefined && (
                    <div className="mt-1.5 h-1 bg-gray-700 rounded-full overflow-hidden">
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
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}

            {!uploading && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 border-2 border-dashed border-gray-600 hover:border-cyan-500 rounded-lg text-cyan-400 hover:text-cyan-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Upload size={14} />
                <span>Add More Files</span>
              </button>
            )}
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-3 space-y-3">
          <h4 className="text-white text-xs font-semibold flex items-center gap-1.5">
            <AlertCircle size={14} className="text-yellow-500" />
            <span>Copyright Agreement</span>
          </h4>
          <div className="text-[11px] text-gray-300 space-y-1.5 max-h-28 overflow-y-auto bg-gray-900/50 rounded-lg p-3">
            <p>By uploading, you confirm:</p>
            <ul className="list-disc list-inside space-y-0.5 text-gray-400">
              <li>You own the copyright or have proper authorization.</li>
              <li>You accept responsibility for any copyright violations.</li>
              <li>You indemnify MySounds.AI from legal claims.</li>
              <li>Unauthorized use may result in account termination.</li>
              <li>You grant MySounds.AI a limited license to process your files.</li>
            </ul>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-600 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-[11px] text-gray-300 group-hover:text-white transition-colors leading-tight">
              I agree to these terms and confirm I have the legal right to upload these files.
            </span>
          </label>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg">
          <AlertCircle size={16} className="flex-shrink-0 text-red-400 mt-0.5" />
          <p className="text-xs text-red-200 whitespace-pre-line">{error}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </p>
          <button
            onClick={handleUpload}
            disabled={uploading || !agreedToTerms}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>Upload</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default LibraryUploader;
