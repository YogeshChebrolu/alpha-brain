'use client';

import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useMutation, useConvex } from 'convex/react';
import { api } from '@alpha-brain/convex';
import type { ArticleEditorProps } from './ArticleEditor';

/**
 * Notion-style block editor (BlockNote). Handles lists / Enter / Tab-nesting /
 * slash menu natively. Inline image/file uploads go through Convex storage via
 * the `uploadFile` handler. Rendered client-only (see ArticleEditor wrapper).
 */
export default function ArticleEditorInner({
  initialContent,
  onChange,
  editable = true,
}: ArticleEditorProps) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const convex = useConvex();

  const uploadFile = async (file: File): Promise<string> => {
    const url = await generateUploadUrl();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!res.ok) throw new Error('Upload failed');
    const { storageId } = await res.json();
    const fileUrl = await convex.query(api.files.getUrl, { storageId });
    if (!fileUrl) throw new Error('Could not resolve uploaded file URL');
    return fileUrl;
  };

  const editor = useCreateBlockNote({
    // BlockNote requires a non-empty array or undefined.
    initialContent:
      initialContent && initialContent.length ? initialContent : undefined,
    uploadFile,
  });

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      onChange={() => onChange?.(editor.document)}
      className="min-h-[300px] py-2"
    />
  );
}
