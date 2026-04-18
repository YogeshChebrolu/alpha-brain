'use client';

import { useState } from 'react';
import { FormElementConfig } from '@/types/form-element.types';
import { getFormElement } from '@/components/form-elements/registry';

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {template.map((config) => {
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

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {mode === 'edit' && (
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-accent text-white py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
        >
          {isSubmitting ? 'Saving...' : 'Save Idea'}
        </button>
      )}
    </form>
  );
}
