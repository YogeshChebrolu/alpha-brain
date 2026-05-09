import type { JSONContent } from '@tiptap/core';

export type ArticleStatus = 'draft' | 'published' | 'archived';

export interface Article {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  content: string; // TipTap JSON stringified
  excerpt: string | null;
  banner_image_url: string | null;
  banner_storage_path: string | null;
  status: ArticleStatus | null;
  published_at: string | null;
  reading_time_minutes: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ArticleInsert {
  user_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  banner_image_url?: string | null;
  banner_storage_path?: string | null;
  status?: ArticleStatus;
  published_at?: string | null;
  reading_time_minutes?: number;
}

export interface ArticleUpdate {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string | null;
  banner_image_url?: string | null;
  banner_storage_path?: string | null;
  status?: ArticleStatus;
  published_at?: string | null;
  reading_time_minutes?: number;
}

export interface Inspiration {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  icon: string;
  gradient: string | null;
  article_id: string | null;
  banner_image_url: string | null;
  display_order: number | null;
  is_active: boolean | null;
  is_system: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined data
  article?: {
    slug: string;
    title: string;
    banner_image_url: string | null;
  } | null;
}

export interface InspirationInsert {
  user_id: string;
  title: string;
  description: string;
  icon?: string;
  gradient?: string;
  article_id?: string | null;
  banner_image_url?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface ArticleEditorProps {
  initialContent?: JSONContent;
  onChange: (content: JSONContent) => void;
  editable?: boolean;
}

export interface BannerUploadProps {
  value?: string | null;
  onChange: (url: string | null, storagePath: string | null) => void;
  userId: string;
  articleId?: string;
}
