import { FormElementProps } from '@/types/form-element.types';

/**
 * Markdown Element - Basic version (to be enhanced with markdown preview)
 * TODO: Add markdown preview/editor library
 */
export default function MarkdownElement({
  config,
  value,
  onChange,
  mode,
}: FormElementProps) {
  if (mode === 'view') {
    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-text">
          {config.label}
        </label>
        <div className="prose prose-sm max-w-none text-text">
          {value || 'No content'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-text">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={config.placeholder || 'Write in markdown...'}
        required={config.required}
        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text bg-white font-mono text-sm"
        rows={8}
      />
      <p className="text-xs text-gray-500 mt-1">
        Supports markdown formatting
      </p>
    </div>
  );
}
