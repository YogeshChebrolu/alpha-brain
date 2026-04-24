'use client';

import { FormElementProps } from '@/types/form-element.types';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Upload, X, FileIcon, FileText, Image, File } from 'lucide-react';

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
  value, // Array of resource IDs
  onChange,
  mode,
}: FormElementProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const supabase = createClient();

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
    const uploadFiles = e.target.files;
    if (!uploadFiles || uploadFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const uploadedResourceIds: string[] = [];
      const uploadedFileData: UploadedFile[] = [];
      const totalFiles = uploadFiles.length;
      let completedFiles = 0;

      for (const file of Array.from(uploadFiles)) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError(`File ${file.name} is too large (max 10MB)`);
          continue;
        }

        // Generate unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${session.user.id}/temp/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('idea-attachments')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('idea-attachments').getPublicUrl(filePath);

        // Save to resources table with metadata
        const { data: resource, error: resourceError } = await supabase
          .from('resources')
          .insert({
            user_id: session.user.id,
            url: publicUrl,
            storage_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            type: file.type.split('/')[0], // 'image', 'application', 'text', etc.
          })
          .select()
          .single();

        if (resourceError) throw resourceError;

        uploadedResourceIds.push(resource.id);
        uploadedFileData.push({
          id: resource.id,
          url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        });

        // Update progress
        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
      }

      // Update value with new resource IDs
      const currentIds = Array.isArray(value) ? value : [];
      onChange([...currentIds, ...uploadedResourceIds]);

      // Update local file list for display
      setFiles([...files, ...uploadedFileData]);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = async (resourceId: string) => {
    try {
      // Get resource to find storage path
      const { data: resource } = await supabase
        .from('resources')
        .select('storage_path')
        .eq('id', resourceId)
        .single();

      if (resource?.storage_path) {
        // Delete from storage
        await supabase.storage
          .from('idea-attachments')
          .remove([resource.storage_path]);
      }

      // Delete from resources table
      await supabase.from('resources').delete().eq('id', resourceId);

      // Update value
      const currentIds = Array.isArray(value) ? value : [];
      onChange(currentIds.filter((id) => id !== resourceId));

      // Update local files
      setFiles(files.filter((f) => f.id !== resourceId));
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete file');
    }
  };

  // Load file metadata in view mode
  useState(() => {
    if (mode === 'view' && value && Array.isArray(value) && value.length > 0) {
      const loadFiles = async () => {
        const { data } = await supabase
          .from('resources')
          .select('id, url, file_name, file_size, mime_type')
          .in('id', value);

        if (data) {
          setFiles(data as UploadedFile[]);
        }
      };
      loadFiles();
    }
  });

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

    return (
      <div className="space-y-3">
        <label className="text-sm font-medium text-neutral-700">
          {config.label}
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {files.map((file) => {
            const Icon = getFileIcon(file.mime_type);
            const isImage = file.mime_type.startsWith('image/');

            return (
              <a
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group border border-neutral-200 rounded-lg p-3 hover:border-neutral-900 hover:shadow-md transition-all bg-white"
              >
                {isImage ? (
                  <div className="aspect-video mb-2 rounded overflow-hidden bg-neutral-50">
                    <img
                      src={file.url}
                      alt={file.file_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                )}
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {file.file_name}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {formatFileSize(file.file_size)}
                </p>
              </a>
            );
          })}
        </div>
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
