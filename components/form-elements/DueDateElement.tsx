'use client';

import { FormElementProps } from '@/types/form-element.types';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Due Date Element
 * Date picker for idea-level deadlines
 * Stores value in ideas.due_date column
 */
export default function DueDateElement({
  config,
  value,
  onChange,
  mode,
}: FormElementProps) {
  const dateValue = value ? new Date(value) : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : null;
    onChange(newDate?.toISOString() || null);
  };

  if (mode === 'view') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">
          {config.label}
        </label>
        {dateValue ? (
          <div className="flex items-center gap-2 text-neutral-900">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <span>{format(dateValue, 'PPP')}</span>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">No due date set</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-900">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
        <input
          type="date"
          value={dateValue ? format(dateValue, 'yyyy-MM-dd') : ''}
          onChange={handleChange}
          required={config.required}
          className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-900 bg-white"
        />
      </div>
      {config.placeholder && (
        <p className="text-xs text-neutral-500">{config.placeholder}</p>
      )}
    </div>
  );
}
