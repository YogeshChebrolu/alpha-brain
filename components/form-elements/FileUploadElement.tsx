'use client';

import { FormElementProps } from '@/types/form-element.types';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Upload, X, FileIcon } from 'lucide-react';

/**
 * File Upload Element with Supabase Storage integration
 * Two-step upload process:
 * 1. Upload to idea-resources/{user_id}/temp/{filename}
 * 2. Save URL to resources table
 * 3. When idea is saved, move from /temp/ to /idea_id/
 */
export default function FileUploadElement({
  config,
  value, // Array of URLs
  onChange,
  mode,
}: FormElementProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        // Step 1: Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${session.user.id}/temp/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('idea-resources')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Step 2: Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('idea-resources').getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);

        // Step 3: Save to resources table
        await supabase.from('resources').insert({
          user_id: session.user.id,
          url: publicUrl,
          type: file.type,
          metadata: { file_name: file.name, size: file.size },
        });
      }

      // Update value with new URLs
      const currentUrls = Array.isArray(value) ? value : [];
      onChange([...currentUrls, ...uploadedUrls]);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (urlToRemove: string) => {
    const currentUrls = Array.isArray(value) ? value : [];
    onChange(currentUrls.filter((url) => url !== urlToRemove));
  };

  if (mode === 'view') {
    const urls = Array.isArray(value) ? value : [];
    if (urls.length === 0) {
      return (
        <div>
          <label className="block text-sm font-medium mb-1 text-text">
            {config.label}
          </label>
          <p className="text-gray-500">No files attached</p>
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium mb-2 text-text">
          {config.label}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {urls.map((url, index) => (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border rounded-lg p-3 hover:border-accent transition-colors flex items-center gap-2 bg-white"
            >
              <FileIcon className="w-5 h-5 text-accent" />
              <span className="text-sm truncate text-text">File {index + 1}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  const urls = Array.isArray(value) ? value : [];

  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-text">
        {config.label}
      </label>

      {/* Upload Button */}
      <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:border-accent cursor-pointer transition-colors bg-white">
        <Upload className="w-4 h-4 text-accent" />
        <span className="text-sm text-text">
          {uploading ? 'Uploading...' : 'Upload Files'}
        </span>
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
        />
      </label>

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      {/* Uploaded Files */}
      {urls.length > 0 && (
        <div className="mt-4 space-y-2">
          {urls.map((url, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 border border-border rounded-lg bg-white"
            >
              <FileIcon className="w-4 h-4 text-accent" />
              <span className="text-sm flex-1 truncate text-text">
                File {index + 1}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveFile(url)}
                className="p-1 hover:bg-red-50 rounded"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
