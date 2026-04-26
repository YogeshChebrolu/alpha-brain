# Supabase Storage Setup Guide

## Prerequisites
- Supabase project created and linked
- Database schema executed successfully
- Authentication working

---

## Step 1: Create Storage Buckets

### In Supabase Dashboard:
1. Go to **Storage** in the left sidebar
2. Click **New Bucket**

### Create Bucket #1: idea-attachments
- **Name**: `idea-attachments`
- **Public**: ❌ **OFF** (Private bucket)
- **File size limit**: 10 MB
- **Allowed MIME types**: Leave empty (allow all)
- Click **Create Bucket**

### Create Bucket #2: action-attachments (Optional - for future use)
- **Name**: `action-attachments`
- **Public**: ❌ **OFF** (Private bucket)
- **File size limit**: 10 MB
- **Allowed MIME types**: Leave empty
- Click **Create Bucket**

---

## Step 2: Set Up Storage Policies

### For `idea-attachments` bucket:

Go to **Storage** → Click on `idea-attachments` → **Policies** tab

#### Policy 1: Allow Users to Upload Their Own Files
```sql
-- Policy Name: Users can upload to their own folder
-- Operation: INSERT
-- Policy Definition:

CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'idea-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Allow Users to View Their Own Files
```sql
-- Policy Name: Users can view their own files
-- Operation: SELECT
-- Policy Definition:

CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'idea-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 3: Allow Users to Update Their Own Files
```sql
-- Policy Name: Users can update their own files
-- Operation: UPDATE
-- Policy Definition:

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'idea-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 4: Allow Users to Delete Their Own Files
```sql
-- Policy Name: Users can delete their own files
-- Operation: DELETE
-- Policy Definition:

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'idea-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Step 3: Test File Upload

### Quick Test via Dashboard:
1. Go to **Storage** → `idea-attachments`
2. Try creating a folder with a UUID
3. Upload a test file
4. Verify you can see and download it

### Test via App:
1. Login to your app
2. Create a new idea
3. Try uploading a file in the Resources field
4. Verify the file appears in Supabase Storage at:
   ```
   idea-attachments/
     └── {your-user-id}/
         └── temp/
             └── {timestamp}_{random}.{ext}
   ```

---

## Step 4: Verify Policies are Working

Run this test in Supabase SQL Editor:

```sql
-- Check storage policies
SELECT * FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage';

-- View your uploaded files
SELECT * FROM storage.objects
WHERE bucket_id = 'idea-attachments'
LIMIT 10;
```

---

## File Organization Structure

```
idea-attachments/
  └── {user_id}/
      ├── temp/                    -- Temporary uploads during idea creation
      │   ├── {timestamp}_abc.jpg
      │   └── {timestamp}_xyz.pdf
      └── {idea_id}/              -- Moved here after idea is saved
          ├── {timestamp}_abc.jpg
          └── {timestamp}_xyz.pdf

action-attachments/
  └── {user_id}/
      └── {action_id}/
          └── {timestamp}_file.jpg
```

---

## Troubleshooting

### Issue: "new row violates row-level security policy"
**Solution**: Make sure RLS policies are created for the bucket

### Issue: "Failed to upload file"
**Solution**: Check:
- User is authenticated
- File size is under 10MB
- Bucket name is correct (`idea-attachments`)
- Storage policies allow user to upload

### Issue: Files not showing in Storage
**Solution**:
- Check the path format: `{user_id}/temp/{filename}`
- Verify bucket name matches exactly
- Check browser console for errors

### Issue: Can't download/view files
**Solution**:
- Verify SELECT policy is created
- Check file path in resources table matches storage path
- Try getting signed URL instead of public URL for private buckets

---

## Advanced: Signed URLs for Private Files

If you want truly private files (not accessible via public URL):

```typescript
// Get a signed URL that expires in 1 hour
const { data, error } = await supabase.storage
  .from('idea-attachments')
  .createSignedUrl(filePath, 3600);

if (data) {
  const signedUrl = data.signedUrl;
  // Use this URL to display/download the file
}
```

Update FileUploadElement to use signed URLs instead of public URLs for better security.

---

## Security Best Practices

1. **Never make buckets public** for user-uploaded files
2. **Always validate file types** on upload
3. **Enforce file size limits** (10MB is reasonable)
4. **Use signed URLs** for sensitive documents
5. **Scan for malware** if allowing any file type (future enhancement)
6. **Set up automatic cleanup** for /temp/ folder (files older than 24 hours)

---

## Next Steps

Once storage is working:
1. Implement file preview for images
2. Add file type icons for different formats
3. Create thumbnail generation for images
4. Add progress bars for large files
5. Implement drag-and-drop upload
6. Add bulk upload support
7. Create file organization by idea (move from /temp/ to /idea_id/)

---

All set! Your Supabase Storage should now be ready for file uploads.
