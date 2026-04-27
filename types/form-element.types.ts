import { LucideIcon } from 'lucide-react';

export type FormElementType =
  | 'text'
  | 'textarea'
  | 'markdown'
  | 'select'
  | 'stock_graph'
  | 'file_upload'
  | 'checkbox'
  | 'date'
  | 'due_date'
  | 'actions'
  | 'link';

export interface FormElementConfig {
  id: string;
  type: FormElementType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface FormElementProps {
  config: FormElementConfig;
  value: any;
  onChange: (value: any) => void;
  mode: 'edit' | 'view';
  ideaCreatedAt?: string;
}

// Meta Registry: Each element has metadata for the Template Builder UI
export interface ElementMetadata {
  type: FormElementType;
  name: string;
  description: string;
  icon: LucideIcon;
  defaultConfig: Partial<FormElementConfig>;
  component: React.ComponentType<FormElementProps>;
}
