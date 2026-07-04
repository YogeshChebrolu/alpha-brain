'use client';

import { FormElementProps } from '@/types/form-element.types';

/**
 * Explanation / long-text element.
 *
 * Deliberately a plain textarea (no rich editor) — simple, reliable plain-text
 * support. The value is stored as a string inside the idea's contentJson.
 * Legacy values that were saved as BlockNote block arrays are coerced to text
 * so old ideas still render.
 */
function toPlainText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';

  const walk = (blocks: any[]): string =>
    blocks
      .map((b) => {
        const inline = Array.isArray(b?.content)
          ? b.content.map((c: any) => (typeof c?.text === 'string' ? c.text : '')).join('')
          : '';
        const nested = Array.isArray(b?.children) ? walk(b.children) : '';
        return [inline, nested].filter(Boolean).join('\n');
      })
      .join('\n');

  return walk(value).trim();
}

export default function MarkdownElement({
  config,
  value,
  onChange,
  mode,
}: FormElementProps) {
  const text = toPlainText(value);

  if (mode === 'view') {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">
          {config.label}
        </label>
        {text ? (
          <p className="text-neutral-900 whitespace-pre-wrap bg-white border border-neutral-200 rounded-lg p-4">
            {text}
          </p>
        ) : (
          <p className="text-neutral-400 bg-white border border-neutral-200 rounded-lg p-4">
            No content
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-900">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={config.placeholder || 'Write your explanation...'}
        rows={8}
        className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 bg-white resize-y"
      />
    </div>
  );
}
