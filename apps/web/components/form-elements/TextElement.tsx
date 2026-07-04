import { FormElementProps } from '@/types/form-element.types';

export default function TextElement({
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
        <p className="text-lg text-text">{value || 'Not provided'}</p>
      </div>
    );
  }

  const isTextarea = config.type === 'textarea';

  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-text">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {isTextarea ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
          required={config.required}
          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text bg-white"
          rows={4}
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
          required={config.required}
          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text bg-white"
        />
      )}
    </div>
  );
}
