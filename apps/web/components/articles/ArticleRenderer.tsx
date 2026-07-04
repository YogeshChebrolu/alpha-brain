'use client';

import ArticleEditor from './ArticleEditor';
import type { PartialBlock } from '@blocknote/core';

interface ArticleRendererProps {
  content: string; // JSON-stringified BlockNote document (array of blocks)
  className?: string;
}

/**
 * Renders stored article content read-only using the same BlockNote editor.
 * Legacy (non-array) content simply renders empty.
 */
export default function ArticleRenderer({ content, className = '' }: ArticleRendererProps) {
  let blocks: PartialBlock[] | undefined;
  try {
    const parsed = JSON.parse(content);
    blocks = Array.isArray(parsed) ? parsed : undefined;
  } catch {
    blocks = undefined;
  }

  return (
    <div className={className}>
      <ArticleEditor editable={false} initialContent={blocks} />
    </div>
  );
}
