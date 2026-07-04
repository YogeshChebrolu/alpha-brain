// Pure article helpers. Data access lives in Convex (packages/convex).

/** Slugify a title: lowercase, strip punctuation, collapse to dashes. */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Estimate reading time (minutes) from content, stripping markup. */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const plainText = content
    .replace(/<[^>]*>/g, '')
    .replace(/[{}[\]"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const wordCount = plainText.split(' ').filter((w) => w.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}
