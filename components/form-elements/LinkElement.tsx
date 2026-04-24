'use client';

import { FormElementProps } from '@/types/form-element.types';
import { useState } from 'react';
import { Plus, X, ExternalLink, Link as LinkIcon } from 'lucide-react';

type LinkItem = {
  url: string;
  title?: string;
  id: string;
};

/**
 * Link/URL Element for storing article URLs, blog posts, tweets, repos, etc.
 * Stores as array of link objects with URL and optional title
 */
export default function LinkElement({
  config,
  value,
  onChange,
  mode,
}: FormElementProps) {
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const links: LinkItem[] = Array.isArray(value) ? value : [];

  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddLink = () => {
    if (!newUrl.trim()) {
      setError('URL is required');
      return;
    }

    if (!isValidUrl(newUrl)) {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    const newLink: LinkItem = {
      id: Date.now().toString(),
      url: newUrl.trim(),
      title: newTitle.trim() || undefined,
    };

    onChange([...links, newLink]);
    setNewUrl('');
    setNewTitle('');
    setError(null);
  };

  const handleRemoveLink = (id: string) => {
    onChange(links.filter((link) => link.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLink();
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  if (mode === 'view') {
    if (links.length === 0) {
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700">
            {config.label}
          </label>
          <p className="text-sm text-neutral-400">No links added</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <label className="text-sm font-medium text-neutral-700">
          {config.label}
        </label>
        <div className="space-y-2">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 p-3 border border-neutral-200 rounded-lg hover:border-neutral-900 hover:shadow-sm transition-all bg-white"
            >
              <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                <LinkIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                {link.title && (
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {link.title}
                  </p>
                )}
                <p className="text-xs text-neutral-500 truncate">
                  {getDomain(link.url)}
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition-colors flex-shrink-0" />
            </a>
          ))}
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

      {/* Existing Links */}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg bg-white hover:border-neutral-300 transition-colors group"
            >
              <div className="p-2 bg-neutral-100 rounded">
                <LinkIcon className="w-4 h-4 text-neutral-700" />
              </div>
              <div className="flex-1 min-w-0">
                {link.title && (
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {link.title}
                  </p>
                )}
                <p className="text-xs text-neutral-500 truncate">{link.url}</p>
              </div>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Open link"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4 text-neutral-600" />
              </a>
              <button
                type="button"
                onClick={() => handleRemoveLink(link.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove link"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Link */}
      <div className="space-y-3 p-4 border border-neutral-200 rounded-lg bg-neutral-50">
        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-700">
            URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="https://example.com/article"
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-neutral-700">
            Title (optional)
          </label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="My Blog Post"
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm"
          />
        </div>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleAddLink}
          className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Link
        </button>
      </div>

      {config.placeholder && (
        <p className="text-xs text-neutral-500">{config.placeholder}</p>
      )}
    </div>
  );
}
