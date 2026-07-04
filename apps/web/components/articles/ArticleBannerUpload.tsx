'use client';

import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { useMutation, useConvex } from 'convex/react';
import { api } from '@alpha-brain/convex';

interface ArticleBannerUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
}

export default function ArticleBannerUpload({
  value,
  onChange,
}: ArticleBannerUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const convex = useConvex();

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
      // 1) get a short-lived upload URL, 2) POST the file, 3) resolve a durable
      // URL for the returned storageId and store it.
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed');
      const { storageId } = await res.json();
      const url = await convex.query(api.files.getUrl, { storageId });
      if (!url) throw new Error('Could not resolve uploaded file URL');
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
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

  const handleRemove = () => {
    onChange(null);
  };

  const handleUrlApply = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      onChange(trimmed);
      setUrlInput('');
      setError(null);
    }
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

      {/* URL fallback while Convex storage upload is not yet wired */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="or paste a banner image URL..."
          className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <button
          type="button"
          onClick={handleUrlApply}
          className="inline-flex shrink-0 items-center gap-1.5 px-3 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors whitespace-nowrap"
        >
          <Upload className="w-4 h-4" />
          Use URL
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
