'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ArticleBannerUploadProps {
  value?: string | null;
  storagePath?: string | null;
  onChange: (url: string | null, storagePath: string | null) => void;
  userId: string;
  articleId?: string;
}

export default function ArticleBannerUpload({
  value,
  storagePath,
  onChange,
  userId,
  articleId,
}: ArticleBannerUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);

      // Use articleId if available, otherwise use temp folder
      const folder = articleId || 'temp';
      const newStoragePath = `${userId}/articles/${folder}/banner_${timestamp}_${random}.${fileExt}`;

      // Delete old banner if exists
      if (storagePath) {
        await supabase.storage
          .from('idea-attachments')
          .remove([storagePath]);
      }

      // Upload new banner
      const { error: uploadError } = await supabase.storage
        .from('idea-attachments')
        .upload(newStoragePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('idea-attachments')
        .getPublicUrl(newStoragePath);

      onChange(urlData.publicUrl, newStoragePath);
    } catch (err) {
      console.error('Banner upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload banner');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleRemove = async () => {
    if (storagePath) {
      try {
        await supabase.storage
          .from('idea-attachments')
          .remove([storagePath]);
      } catch (err) {
        console.error('Failed to delete banner from storage:', err);
      }
    }
    onChange(null, null);
  };

  if (value) {
    return (
      <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden group">
        <img
          src={value}
          alt="Article banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 bg-white rounded-lg text-sm font-medium hover:bg-neutral-100 transition-colors"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Remove
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative w-full aspect-[3/1] rounded-xl border-2 border-dashed transition-all cursor-pointer
          flex flex-col items-center justify-center gap-3
          ${dragOver
            ? 'border-neutral-900 bg-neutral-100'
            : 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50'
          }
          ${uploading ? 'opacity-50 cursor-wait' : ''}
        `}
      >
        {uploading ? (
          <>
            <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
            <p className="text-sm text-neutral-600">Uploading...</p>
          </>
        ) : (
          <>
            <div className="p-3 bg-neutral-100 rounded-full">
              <ImageIcon className="w-6 h-6 text-neutral-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-700">
                Click to upload banner image
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                or drag and drop (recommended 1200x400)
              </p>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
