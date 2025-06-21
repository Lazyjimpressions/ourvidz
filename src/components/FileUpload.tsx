
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { StorageBucket, UploadProgress, UploadResult } from '@/lib/storage';

interface FileUploadProps {
  bucket: StorageBucket;
  onUpload: (filePath: string, file: File) => Promise<UploadResult>;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
  accept?: string;
  maxSize?: number; // in bytes
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const FileUpload = ({
  bucket,
  onUpload,
  onSuccess,
  onError,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB default
  disabled = false,
  className = "",
  children
}: FileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      setError(`File size must be less than ${maxSizeMB}MB`);
      setUploadStatus('error');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setUploadStatus('idle');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus('idle');
    setError(null);

    try {
      const fileName = `${Date.now()}-${selectedFile.name}`;
      
      const result = await onUpload(fileName, selectedFile);
      
      if (result.error) {
        throw result.error;
      }

      setUploadStatus('success');
      onSuccess?.(result);
      
      // Clear file after successful upload
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      setError(error.message);
      setUploadStatus('error');
      onError?.(error);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setError(null);
    setUploadStatus('idle');
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProgressUpdate = (progress: UploadProgress) => {
    setUploadProgress(progress);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
        />
        
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {children || 'Select File'}
        </Button>

        {selectedFile && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">{selectedFile.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {selectedFile && !isUploading && uploadStatus === 'idle' && (
        <Button
          onClick={handleUpload}
          disabled={disabled}
          className="w-full"
        >
          Upload to {bucket}
        </Button>
      )}

      {isUploading && uploadProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Uploading...</span>
            <span>{uploadProgress.percentage.toFixed(0)}%</span>
          </div>
          <Progress value={uploadProgress.percentage} className="w-full" />
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle className="h-4 w-4" />
          <span>Upload successful!</span>
        </div>
      )}

      {uploadStatus === 'error' && error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
