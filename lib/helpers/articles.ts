import { createClient } from '@/lib/supabase/client';
import type { Article, ArticleInsert, ArticleUpdate, Inspiration, InspirationInsert } from '@/types/article.types';

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate a unique slug by checking database for conflicts
 */
export async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const supabase = createClient();
  const baseSlug = generateSlug(title);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    let query = supabase
      .from('articles')
      .select('id')
      .eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query.single();

    if (!data) break;
    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
}

/**
 * Calculate reading time based on word count
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  // Strip HTML/JSON formatting to get plain text
  const plainText = content
    .replace(/<[^>]*>/g, '')
    .replace(/[{}[\]"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const wordCount = plainText.split(' ').filter(w => w.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

/**
 * Extract an excerpt from content
 */
export function extractExcerpt(content: string, maxLength: number = 160): string {
  // Parse TipTap JSON and extract text
  try {
    const parsed = JSON.parse(content);
    let text = '';

    function extractText(node: any) {
      if (node.text) {
        text += node.text + ' ';
      }
      if (node.content) {
        node.content.forEach(extractText);
      }
    }

    extractText(parsed);
    text = text.trim();

    if (text.length > maxLength) {
      return text.substring(0, maxLength).trim() + '...';
    }
    return text;
  } catch {
    // If not valid JSON, treat as plain text
    const plainText = content
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (plainText.length > maxLength) {
      return plainText.substring(0, maxLength).trim() + '...';
    }
    return plainText;
  }
}

/**
 * Create a new article
 */
export async function createArticle(data: ArticleInsert): Promise<Article> {
  const supabase = createClient();

    const { data: article, error } = await supabase
    .from('articles')
    .insert({
      ...data,
      reading_time_minutes: calculateReadingTime(data.content),
      excerpt: data.excerpt || extractExcerpt(data.content),
    })
    .select()
    .single();

  if (error) throw error;
  return article as Article;
}

/**
 * Update an existing article
 */
export async function updateArticle(id: string, data: ArticleUpdate): Promise<Article> {
  const supabase = createClient();

  const updateData: any = { ...data };

  // Recalculate reading time if content changed
  if (data.content) {
    updateData.reading_time_minutes = calculateReadingTime(data.content);
    if (!data.excerpt) {
      updateData.excerpt = extractExcerpt(data.content);
    }
  }

    const { data: article, error } = await supabase
    .from('articles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return article as Article;
}

/**
 * Delete an article
 */
export async function deleteArticle(id: string): Promise<void> {
  const supabase = createClient();

  // Get article to find banner storage path
    const { data: article } = await supabase
    .from('articles')
    .select('banner_storage_path')
    .eq('id', id)
    .single();

  // Delete banner from storage if exists
  if (article?.banner_storage_path) {
    await supabase.storage
      .from('idea-attachments')
      .remove([article.banner_storage_path]);
  }

  // Delete article (cascade will handle article_images)
    const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Get article by slug
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const supabase = createClient();

    const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as Article;
}

/**
 * Get article by ID
 */
export async function getArticleById(id: string): Promise<Article | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Article;
}

/**
 * Get all articles for a user
 */
export async function getUserArticles(userId: string): Promise<Article[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Article[]) || [];
}

/**
 * Get published articles for a user
 */
export async function getPublishedArticles(userId: string): Promise<Article[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'published')
    .order('published_at', { ascending: false});

  if (error) throw error;
  return (data as Article[]) || [];
}

/**
 * Upload article banner image
 */
export async function uploadArticleBanner(
  userId: string,
  articleId: string,
  file: File
): Promise<{ url: string; storagePath: string }> {
  const supabase = createClient();

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `${userId}/articles/${articleId}/banner.${fileExt}`;

  // Delete existing banner if any
  await supabase.storage
    .from('idea-attachments')
    .remove([storagePath]);

  // Upload new banner
  const { error: uploadError } = await supabase.storage
    .from('idea-attachments')
    .upload(storagePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('idea-attachments')
    .getPublicUrl(storagePath);

  return {
    url: urlData.publicUrl,
    storagePath,
  };
}

/**
 * Upload image for article content
 */
export async function uploadArticleContentImage(
  userId: string,
  articleId: string,
  file: File
): Promise<string> {
  const supabase = createClient();

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `${userId}/articles/${articleId}/content/${timestamp}_${random}.${fileExt}`;

  // Upload image
  const { error: uploadError } = await supabase.storage
    .from('idea-attachments')
    .upload(storagePath, file, {
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('idea-attachments')
    .getPublicUrl(storagePath);

  // Create resource record
  const { data: resource, error: resourceError } = await supabase
    .from('resources')
    .insert({
      user_id: userId,
      url: urlData.publicUrl,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      type: 'image',
    })
    .select('id')
    .single();

  if (resourceError) throw resourceError;

  // Link to article
  await supabase
    .from('article_images')
    .insert({
      article_id: articleId,
      resource_id: resource.id,
    });

  return urlData.publicUrl;
}

/**
 * Delete article banner
 */
export async function deleteArticleBanner(articleId: string): Promise<void> {
  const supabase = createClient();

  // Get current banner path
  const { data: article } = await supabase
    .from('articles')
    .select('banner_storage_path')
    .eq('id', articleId)
    .single();

  if (article?.banner_storage_path) {
    // Delete from storage
    await supabase.storage
      .from('idea-attachments')
      .remove([article.banner_storage_path]);

    // Update article
    await supabase
      .from('articles')
      .update({
        banner_image_url: null,
        banner_storage_path: null,
      })
      .eq('id', articleId);
  }
}

/**
 * Get all inspirations (latest 5, ordered by creation date)
 */
export async function getInspirations(): Promise<Inspiration[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('inspirations')
    .select(`
      *,
      article:articles (
        slug,
        title,
        banner_image_url
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw error;
  return data || [];
}

/**
 * Link an inspiration to an article
 */
export async function linkInspirationToArticle(
  inspirationId: string,
  articleId: string
): Promise<void> {
  const supabase = createClient();

  // Get article banner to optionally use
  const { data: article } = await supabase
    .from('articles')
    .select('banner_image_url')
    .eq('id', articleId)
    .single();

  const { error } = await supabase
    .from('inspirations')
    .update({
      article_id: articleId,
      banner_image_url: article?.banner_image_url || null,
    })
    .eq('id', inspirationId);

  if (error) throw error;
}

/**
 * Get inspiration linked to an article
 */
export async function getInspirationByArticleId(
  articleId: string
): Promise<Inspiration | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('inspirations')
    .select('*')
    .eq('article_id', articleId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data as Inspiration;
}

/**
 * Create inspiration for article
 */
export async function createInspiration(
  data: InspirationInsert
): Promise<Inspiration> {
  const supabase = createClient();
  const { data: inspiration, error } = await supabase
    .from('inspirations')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return inspiration as Inspiration;
}

/**
 * Update inspiration
 */
export async function updateInspiration(
  id: string,
  data: Partial<Omit<Inspiration, 'article' | 'created_at' | 'id'>>
): Promise<Inspiration> {
  const supabase = createClient();
  const { data: inspiration, error } = await supabase
    .from('inspirations')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return inspiration as Inspiration;
}

/**
 * Delete inspiration (hard delete)
 */
export async function deleteInspiration(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('inspirations')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Sync article banner to linked inspiration
 * Called when article is published
 */
export async function syncInspirationBanner(
  articleId: string,
  bannerUrl: string | null
): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('inspirations')
    .update({ banner_image_url: bannerUrl })
    .eq('article_id', articleId);
}
