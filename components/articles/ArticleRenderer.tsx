'use client';

import { useMemo } from 'react';
import type { JSONContent } from 'novel';

interface ArticleRendererProps {
  content: string; // JSON stringified TipTap content
  className?: string;
}

/**
 * Renders TipTap JSON content as HTML
 */
export default function ArticleRenderer({ content, className = '' }: ArticleRendererProps) {
  const html = useMemo(() => {
    try {
      const json: JSONContent = JSON.parse(content);
      return renderNode(json);
    } catch {
      // If not valid JSON, return as plain text
      return `<p>${content}</p>`;
    }
  }, [content]);

  return (
    <div
      className={`prose prose-neutral max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function renderNode(node: JSONContent): string {
  if (!node) return '';

  // Text node
  if (node.type === 'text') {
    let text = escapeHtml(node.text || '');

    // Apply marks
    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'bold':
            text = `<strong>${text}</strong>`;
            break;
          case 'italic':
            text = `<em>${text}</em>`;
            break;
          case 'underline':
            text = `<u>${text}</u>`;
            break;
          case 'strike':
            text = `<s>${text}</s>`;
            break;
          case 'code':
            text = `<code>${text}</code>`;
            break;
          case 'link':
            const href = escapeHtml(mark.attrs?.href || '#');
            text = `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
            break;
        }
      }
    }
    return text;
  }

  // Render children
  const children = node.content?.map(renderNode).join('') || '';

  // Block nodes
  switch (node.type) {
    case 'doc':
      return children;

    case 'paragraph':
      return `<p>${children || '<br>'}</p>`;

    case 'heading':
      const level = node.attrs?.level || 1;
      return `<h${level}>${children}</h${level}>`;

    case 'bulletList':
      return `<ul>${children}</ul>`;

    case 'orderedList':
      return `<ol>${children}</ol>`;

    case 'listItem':
      return `<li>${children}</li>`;

    case 'taskList':
      return `<ul class="task-list">${children}</ul>`;

    case 'taskItem':
      const checked = node.attrs?.checked ? 'checked' : '';
      return `<li class="task-item"><input type="checkbox" ${checked} disabled />${children}</li>`;

    case 'blockquote':
      return `<blockquote>${children}</blockquote>`;

    case 'codeBlock':
      const language = node.attrs?.language || '';
      return `<pre><code class="language-${language}">${children}</code></pre>`;

    case 'horizontalRule':
      return '<hr />';

    case 'image':
      const src = escapeHtml(node.attrs?.src || '');
      const alt = escapeHtml(node.attrs?.alt || '');
      const title = node.attrs?.title ? `title="${escapeHtml(node.attrs.title)}"` : '';
      return `<figure><img src="${src}" alt="${alt}" ${title} loading="lazy" />${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>`;

    case 'hardBreak':
      return '<br />';

    default:
      return children;
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
