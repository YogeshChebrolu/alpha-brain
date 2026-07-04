'use client';

import { FormElementProps } from '@/types/form-element.types';
import { useState } from 'react';
import { useMutation, useConvex } from 'convex/react';
import { api } from '@alpha-brain/convex';
import { Upload, X, FileText, Image, File } from 'lucide-react';

type UploadedFile = {
  id: string;
  url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
};

/**
 * File Upload Element with Supabase Storage integration
 * Uploads to idea-attachments bucket
 * Stores metadata in resources table
 */
export default function FileUploadElement({
  config,
  value, // Array of uploaded file objects (stored in the idea's contentJson)
  onChange,
  mode,
}: FormElementProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const convex = useConvex();

  const files: UploadedFile[] = Array.isArray(value) ? (value as UploadedFile[]) : [];

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const uploaded: UploadedFile[] = [];
      for (const file of selected) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
        const { storageId } = await res.json();
        const url = await convex.query(api.files.getUrl, { storageId });
        if (!url) continue;
        uploaded.push({
          id: storageId,
          url,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        });
      }
      onChange([...files, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveFile = (fileId: string) => {
    onChange(files.filter((f) => f.id !== fileId));
  };

  if (mode === 'view') {
    if (files.length === 0) {
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700">
            {config.label}
          </label>
          <p className="text-sm text-neutral-400">No files attached</p>
        </div>
      );
    }

    // Separate images and other files
    const imageFiles = files.filter((f) => f.mime_type.startsWith('image/'));
    const otherFiles = files.filter((f) => !f.mime_type.startsWith('image/'));

    return (
      <div className="space-y-3">
        <label className="text-sm font-medium text-neutral-700">
          {config.label}
        </label>

        {/* Image Files - Grid Layout */}
        {imageFiles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {imageFiles.map((file) => (
              <a
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group border border-neutral-200 rounded-lg p-3 hover:border-neutral-900 hover:shadow-md transition-all bg-white"
              >
                <div className="aspect-video mb-2 rounded overflow-hidden bg-neutral-50">
                  <img
                    src={file.url}
                    alt={file.file_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {file.file_name}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {formatFileSize(file.file_size)}
                </p>
              </a>
            ))}
          </div>
        )}

        {/* Other Files - Compact List */}
        {otherFiles.length > 0 && (
          <div className="space-y-2">
            {otherFiles.map((file) => {
              const Icon = getFileIcon(file.mime_type);
              return (
                <a
                  key={file.id}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-3 border border-neutral-200 rounded-lg hover:border-neutral-900 hover:shadow-sm transition-all bg-white"
                >
                  <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {file.file_name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatFileSize(file.file_size)}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-neutral-900">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((file) => {
            const Icon = getFileIcon(file.mime_type);
            const isImage = file.mime_type.startsWith('image/');

            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg bg-white hover:border-neutral-300 transition-colors"
              >
                {isImage ? (
                  <img
                    src={file.url}
                    alt={file.file_name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="p-2 bg-neutral-100 rounded">
                    <Icon className="w-5 h-5 text-neutral-700" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {file.file_name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatFileSize(file.file_size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Button */}
      <div className="space-y-3">
        <label className="inline-flex items-center gap-2 px-4 py-3 border border-neutral-200 rounded-lg hover:border-neutral-900 hover:bg-neutral-50 cursor-pointer transition-all bg-white">
          <Upload className="w-5 h-5 text-neutral-600" />
          <span className="text-sm text-neutral-900 font-medium">
            {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Files'}
          </span>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
        </label>

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-accent to-neutral-700 h-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {config.placeholder && (
        <p className="text-xs text-neutral-500">{config.placeholder}</p>
      )}
    </div>
  );
}
