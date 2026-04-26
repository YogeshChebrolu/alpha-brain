import { FormElementConfig } from './form-element.types';

export interface Template {
  id: string;
  user_id: string | null;
  name: string;
  form_structure: FormElementConfig[]; // JSONB field
  is_system: boolean;
  created_at: string;
}
