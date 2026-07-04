'use client';

import dynamic from 'next/dynamic';
import type { Block, PartialBlock } from '@blocknote/core';

export interface ArticleEditorProps {
  initialContent?: PartialBlock[];
  onChange?: (blocks: Block[]) => void;
  editable?: boolean;
  // Accepted for call-site compatibility; BlockNote has its own placeholder.
  placeholder?: string;
}

// BlockNote must run client-only — dynamic import with ssr:false avoids the
// editor touching `window`/`document` during server render.
const ArticleEditorInner = dynamic(() => import('./ArticleEditorInner'), {
  ssr: false,
  loading: () => <div className="min-h-[300px]" />,
});

export default function ArticleEditor(props: ArticleEditorProps) {
  return <ArticleEditorInner {...props} />;
}
