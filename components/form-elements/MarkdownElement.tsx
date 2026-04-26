'use client';

import { FormElementProps } from '@/types/form-element.types';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, Edit3 } from 'lucide-react';

/**
 * Markdown Element with live preview
 * Shows side-by-side editor and preview on desktop, tabs on mobile
 */
export default function MarkdownElement({
  config,
  value,
  onChange,
  mode,
}: FormElementProps) {
  const [previewTab, setPreviewTab] = useState<'edit' | 'preview'>('edit');

  if (mode === 'view') {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">
          {config.label}
        </label>
        <div className="prose prose-sm max-w-none text-neutral-900 p-4 bg-white border border-neutral-200 rounded-lg">
          {value ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {value as string}
            </ReactMarkdown>
          ) : (
            <p className="text-neutral-400">No content</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-900">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Mobile Tabs */}
      <div className="flex md:hidden border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setPreviewTab('edit')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            previewTab === 'edit'
              ? 'text-neutral-900 border-b-2 border-neutral-900'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          Write
        </button>
        <button
          type="button"
          onClick={() => setPreviewTab('preview')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            previewTab === 'preview'
              ? 'text-neutral-900 border-b-2 border-neutral-900'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
      </div>

      {/* Desktop: Side-by-side, Mobile: Tabbed */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Editor */}
        <div className={previewTab === 'edit' ? 'block' : 'hidden md:block'}>
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={config.placeholder || '# Your markdown here\n\nWrite in **markdown** format...'}
            required={config.required}
            className="w-full h-64 md:h-80 px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-neutral-900 bg-white font-mono text-sm resize-none"
          />
        </div>

        {/* Preview */}
        <div className={previewTab === 'preview' ? 'block' : 'hidden md:block'}>
          <div className="h-64 md:h-80 px-4 py-3 border border-neutral-200 rounded-lg bg-neutral-50 overflow-y-auto">
            {value ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {value as string}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-neutral-400 text-sm italic">
                Preview will appear here...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
