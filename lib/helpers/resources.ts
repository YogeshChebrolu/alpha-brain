import { createClient } from '@/lib/supabase/client';

/**
 * Link resources to an idea via idea_attachments table
 */
export async function linkResourcesToIdea(ideaId: string, resourceIds: string[]) {
  const supabase = createClient();

  if (!resourceIds || resourceIds.length === 0) return;

  try {
    // Remove duplicate resource IDs
    const uniqueResourceIds = [...new Set(resourceIds)];

    // Create junction table entries
    const attachments = uniqueResourceIds.map((resourceId) => ({
      idea_id: ideaId,
      resource_id: resourceId,
    }));

    // Use upsert to handle duplicates gracefully
    const { error } = await supabase
      .from('idea_attachments')
      .upsert(attachments, {
        onConflict: 'idea_id,resource_id',
        ignoreDuplicates: true
      });

    if (error) throw error;
  } catch (err) {
    console.error('Error linking resources to idea:', err);
    throw err;
  }
}

/**
 * Link resources to an action via action_attachments table
 */
export async function linkResourcesToAction(actionId: string, resourceIds: string[]) {
  const supabase = createClient();

  if (!resourceIds || resourceIds.length === 0) return;

  try {
    // Remove duplicate resource IDs
    const uniqueResourceIds = [...new Set(resourceIds)];

    const attachments = uniqueResourceIds.map((resourceId) => ({
      action_id: actionId,
      resource_id: resourceId,
    }));

    // Use upsert to handle duplicates gracefully
    const { error } = await supabase
      .from('action_attachments')
      .upsert(attachments, {
        onConflict: 'action_id,resource_id',
        ignoreDuplicates: true
      });

    if (error) throw error;
  } catch (err) {
    console.error('Error linking resources to action:', err);
    throw err;
  }
}

/**
 * Move uploaded files from /temp/ to /idea_id/ folder
 * Call this after idea is successfully saved
 */
export async function moveTemporaryFiles(userId: string, ideaId: string, resourceIds: string[]) {
  const supabase = createClient();

  if (!resourceIds || resourceIds.length === 0) return;

  try {
    // Get resources with storage paths
    const { data: resources, error: fetchError } = await supabase
      .from('resources')
      .select('id, storage_path')
      .in('id', resourceIds);

    if (fetchError) throw fetchError;
    if (!resources) return;

    // Move each file from /temp/ to /idea_id/
    for (const resource of resources) {
      if (!resource.storage_path) continue;

      // Only move if currently in /temp/
      if (!resource.storage_path.includes('/temp/')) continue;

      const fileName = resource.storage_path.split('/').pop();
      const newPath = `${userId}/${ideaId}/${fileName}`;

      // Move file in storage
      const { error: moveError } = await supabase.storage
        .from('idea-attachments')
        .move(resource.storage_path, newPath);

      if (moveError) {
        console.error(`Failed to move file ${resource.storage_path}:`, moveError);
        continue;
      }

      // Update storage path in resources table
      const { error: updateError } = await supabase
        .from('resources')
        .update({ storage_path: newPath })
        .eq('id', resource.id);

      if (updateError) {
        console.error(`Failed to update resource path for ${resource.id}:`, updateError);
      }
    }
  } catch (err) {
    console.error('Error moving temporary files:', err);
    // Don't throw - file organization is not critical
  }
}

/**
 * Clean up temporary files older than 24 hours
 * Run this periodically via cron job or Supabase Edge Function
 */
export async function cleanupOldTemporaryFiles() {
  const supabase = createClient();

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find resources in /temp/ older than 24 hours
    const { data: oldResources, error: fetchError } = await supabase
      .from('resources')
      .select('id, storage_path')
      .like('storage_path', '%/temp/%')
      .lt('created_at', twentyFourHoursAgo.toISOString());

    if (fetchError) throw fetchError;
    if (!oldResources || oldResources.length === 0) return;

    // Delete from storage
    const pathsToDelete = oldResources
      .map((r) => r.storage_path)
      .filter(Boolean) as string[];

    if (pathsToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('idea-attachments')
        .remove(pathsToDelete);

      if (storageError) {
        console.error('Error deleting old temp files from storage:', storageError);
      }
    }

    // Delete from resources table
    const idsToDelete = oldResources.map((r) => r.id);
    const { error: deleteError } = await supabase
      .from('resources')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Error deleting old temp resources:', deleteError);
    }

    console.log(`Cleaned up ${oldResources.length} old temporary files`);
  } catch (err) {
    console.error('Error in cleanup:', err);
  }
}

/**
 * Get all resources for an idea
 */
export async function getIdeaResources(ideaId: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('idea_attachments')
      .select(`
        resource_id,
        resources (
          id,
          url,
          file_name,
          file_size,
          mime_type,
          storage_path
        )
      `)
      .eq('idea_id', ideaId);

    if (error) throw error;

    return data?.map((item: any) => item.resources) || [];
  } catch (err) {
    console.error('Error fetching idea resources:', err);
    return [];
  }
}

/**
 * Delete a resource and remove from storage
 */
export async function deleteResource(resourceId: string) {
  const supabase = createClient();

  try {
    // Get resource to find storage path
    const { data: resource, error: fetchError } = await supabase
      .from('resources')
      .select('storage_path')
      .eq('id', resourceId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (resource?.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('idea-attachments')
        .remove([resource.storage_path]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
      }
    }

    // Delete from resources table (cascade will handle attachments)
    const { error: deleteError } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId);

    if (deleteError) throw deleteError;
  } catch (err) {
    console.error('Error deleting resource:', err);
    throw err;
  }
}
