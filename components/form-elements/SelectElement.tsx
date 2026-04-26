import { FormElementProps } from '@/types/form-element.types';

export default function SelectElement({
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
        <p className="text-lg text-text">{value || 'Not selected'}</p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-text">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={config.required}
        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-text bg-white"
      >
        <option value="">Select an option</option>
        {config.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
