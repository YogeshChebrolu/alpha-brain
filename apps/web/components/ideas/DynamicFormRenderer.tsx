'use client';

import { useState } from 'react';
import { FormElementConfig } from '@/types/form-element.types';
import { getFormElement } from '@/components/form-elements/registry';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  template: FormElementConfig[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  mode: 'edit' | 'view';
  ideaCreatedAt?: string;
}

/**
 * Dynamic Form Renderer
 * Renders forms based on JSONB template structure
 * Uses the Meta Registry to map element types to React components
 */
export default function DynamicFormRenderer({
  template,
  initialValues = {},
  onSubmit,
  mode,
  ideaCreatedAt,
}: Props) {
  const [formValues, setFormValues] = useState<Record<string, any>>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (fieldId: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      for (const config of template) {
        if (config.required && !formValues[config.id]) {
          throw new Error(`${config.label} is required`);
        }
      }

      await onSubmit(formValues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract due_date field for special rendering
  const dueDateField = template.find((config) => config.type === 'due_date');
  const regularFields = template.filter((config) => config.type !== 'due_date');
  const dueDateValue = dueDateField ? formValues[dueDateField.id] : null;

  return (
    <div className="relative">
      {/* Due Date Badge - Top Right Corner */}
      {dueDateField && dueDateValue && mode === 'view' && (
        <div className="absolute -top-3 right-0 z-10">
          <div className="bg-gradient-to-br from-white to-neutral-50 border-2 border-neutral-200 rounded-xl px-4 py-2 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-accent to-accent/80 rounded-lg">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
                  Due
                </p>
                <p className="text-sm font-bold text-neutral-900">
                  {format(new Date(dueDateValue), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {regularFields.map((config) => {
          const Element = getFormElement(config.type);
          return (
            <div key={config.id}>
              <Element
                config={config}
                value={formValues[config.id]}
                onChange={(value) => handleChange(config.id, value)}
                mode={mode}
                ideaCreatedAt={ideaCreatedAt}
              />
            </div>
          );
        })}

        {/* Due Date Input in Edit Mode */}
        {dueDateField && mode === 'edit' && (
          <div>
            {(() => {
              const Element = getFormElement(dueDateField.type);
              return (
                <Element
                  config={dueDateField}
                  value={formValues[dueDateField.id]}
                  onChange={(value) => handleChange(dueDateField.id, value)}
                  mode={mode}
                  ideaCreatedAt={ideaCreatedAt}
                />
              );
            })()}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {mode === 'edit' && (
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-8 w-full items-center justify-center bg-accent text-white py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium md:h-auto"
          >
            {isSubmitting ? 'Saving...' : 'Save Idea'}
          </button>
        )}
      </form>
    </div>
  );
}
