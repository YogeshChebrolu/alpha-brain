export interface Idea {
  id: string;
  user_id: string;
  category_id: string | null;
  parent_id: string | null;
  title: string;
  content_json: Record<string, any>; // JSONB with dynamic form values
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  icon: string;
  created_at: string;
}

export interface IdeaWithRelations extends Idea {
  category?: Category;
  actions?: Action[];
  attachments?: Resource[];
}

export interface Action {
  id: string;
  idea_id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  due_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  user_id: string;
  url: string;
  file_type: string;
  file_name: string;
  created_at: string;
}
