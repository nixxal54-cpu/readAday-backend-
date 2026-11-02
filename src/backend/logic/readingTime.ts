/**
 * Content Utilities & Input Validation
 * Calculates reading time, slugs, sanitizes markdown/HTML, and validates inputs.
 */

/**
 * Calculates estimated reading time in minutes (based on 200 words per minute average).
 * Returns at least 1 minute.
 */
export function calculateReadingTime(content: string): number {
  if (!content || !content.trim()) return 1;

  // Strip HTML tags / markdown syntax for word count
  const cleanText = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*`_~[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleanText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}

/**
 * Generates a clean URL slug from title with optional random suffix for uniqueness.
 */
export function generateSlug(title: string, addUniqueSuffix: boolean = false): string {
  let slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^\w\s-]/g, '') // remove special characters
    .trim()
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/-+/g, '-'); // collapse multiple hyphens

  if (!slug) slug = 'article';

  if (addUniqueSuffix) {
    const suffix = Math.random().toString(36).substring(2, 7);
    slug = `${slug}-${suffix}`;
  }

  return slug;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

/**
 * Validates article payload before creation or update.
 */
export function validateArticleInput(data: {
  title?: string;
  summary?: string;
  content?: string;
  contentType?: string;
  categorySlug?: string;
}): { valid: boolean; errors: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];

  if (!data.title || data.title.trim().length < 5) {
    errors.push({ field: 'title', message: 'Title must be at least 5 characters long.' });
  }

  if (data.title && data.title.length > 200) {
    errors.push({ field: 'title', message: 'Title cannot exceed 200 characters.' });
  }

  if (!data.summary || data.summary.trim().length < 10) {
    errors.push({ field: 'summary', message: 'Summary must be at least 10 characters long.' });
  }

  if (!data.content || data.content.trim().length < 20) {
    errors.push({ field: 'content', message: 'Content body must be at least 20 characters long.' });
  }

  if (data.contentType && !['editorial', 'news', 'community'].includes(data.contentType)) {
    errors.push({ field: 'contentType', message: 'Invalid contentType. Must be editorial, news, or community.' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
