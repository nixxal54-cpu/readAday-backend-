/**
 * Gutendex Content Provider Adapter
 * Public-Domain Books & Classic Literature via Project Gutenberg
 * Content Identity: 'books'
 */

import { BaseProviderAdapter } from '../baseAdapter.ts';
import { NormalizedProviderItem, ProviderFetchOptions } from '../types.ts';
import { ContentProviderId, ContentIdentity } from '../../types.ts';

export class GutendexAdapter extends BaseProviderAdapter {
  readonly id: ContentProviderId = 'gutendex';
  readonly name = 'Gutendex Project Gutenberg';
  readonly description = 'Public-domain classic literature, philosophical treatises, and historic literary canon';
  readonly contentIdentity: ContentIdentity = 'books';
  readonly requiresApiKey = false;

  async fetchContent(options: ProviderFetchOptions = {}): Promise<NormalizedProviderItem[]> {
    const query = options.query || options.category || '';
    const page = options.page || 1;
    const limit = Math.min(options.limit || 8, 20);

    let url = `https://gutendex.com/books/?languages=en&page=${page}`;
    if (query && query !== 'philosophy' && query !== 'all') {
      url += `&search=${encodeURIComponent(query)}`;
    }

    const res = await this.safeFetch(url, {}, 8000, 1);
    if (!res.ok) {
      throw new Error(`Gutendex API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const books = data?.results || [];

    return books.slice(0, limit).map((book: any) => {
      const title = this.sanitizeText(book.title || 'Classic Volume');
      const authors = (book.authors || [])
        .map((a: any) => this.sanitizeText(a.name))
        .filter(Boolean);
      const authorName = authors.length > 0 ? authors.join(', ') : 'Historic Author';
      const authorLife = book.authors?.[0]?.birth_year
        ? ` (${book.authors[0].birth_year}–${book.authors[0].death_year || '?'})`
        : '';

      const subjects = Array.isArray(book.subjects) ? book.subjects : [];
      const primarySubject = subjects[0] || 'Classic Literature';

      // Formats: cover image, reader html, text link
      const formats = book.formats || {};
      const coverImageUrl = formats['image/jpeg'] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80';
      const readOnlineHtmlUrl = formats['text/html'] || formats['text/html; charset=utf-8'];
      const rawTextUrl = formats['text/plain; charset=utf-8'] || formats['text/plain'];
      const epubUrl = formats['application/epub+zip'];
      const originalUrl = readOnlineHtmlUrl || `https://www.gutenberg.org/ebooks/${book.id}`;

      // Gutenberg summarizes via summaries or subjects
      const summaries = Array.isArray(book.summaries) && book.summaries.length > 0 ? book.summaries[0] : '';
      const summary = summaries
        ? this.sanitizeText(summaries).slice(0, 260) + '...'
        : `A timeless masterwork by ${authorName}. Preserved in the public domain by Project Gutenberg with over ${book.download_count?.toLocaleString() || '1,000'} reader downloads.`;

      const externalId = `gutenberg_${book.id}`;

      // Public domain attribution card with reader links
      const publicDomainNotice = `
<div class="readaday-book-card p-6 rounded-xl bg-slate-900/80 border border-amber-900/40 text-slate-200 my-6 shadow-xl">
  <div class="flex items-center justify-between pb-3 border-b border-slate-800">
    <div>
      <span class="text-xs font-bold uppercase tracking-wider text-amber-400">Project Gutenberg Canon</span>
      <span class="ml-2 text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">Public Domain</span>
    </div>
    <span class="text-xs text-slate-400">${book.download_count || 0} Downloads</span>
  </div>

  <div class="mt-4 prose max-w-none text-slate-300 font-serif leading-relaxed">
    <p class="text-lg italic text-slate-100 mb-2">${title}</p>
    <p class="text-sm text-slate-400">By <strong>${authorName}${authorLife}</strong></p>
    <p class="text-sm mt-3">${summary}</p>
  </div>

  <div class="mt-6 pt-4 border-t border-slate-800 flex flex-wrap gap-3">
    ${
      readOnlineHtmlUrl
        ? `<a href="${readOnlineHtmlUrl}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors">
            Read Online (Full Book) &rarr;
          </a>`
        : ''
    }
    ${
      epubUrl
        ? `<a href="${epubUrl}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors">
            Download EPUB
          </a>`
        : ''
    }
    ${
      rawTextUrl
        ? `<a href="${rawTextUrl}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors">
            Plain Text (UTF-8)
          </a>`
        : ''
    }
  </div>
</div>
      `.trim();

      return {
        externalId,
        title,
        slug: this.generateSlug(title, externalId),
        summary,
        content: publicDomainNotice,
        contentType: 'books',
        authorName,
        categoryName: 'Literature & Essays',
        categorySlug: 'literature-essays',
        tags: ['books', 'classics', 'public-domain', 'gutenberg', primarySubject.toLowerCase().replace(/[^a-z0-9]/g, '-')],
        coverImageUrl,
        sourcePublisher: 'Project Gutenberg',
        originalUrl,
        contentRights: 'licensed_full', // Public Domain allows full reproduction & reading
        fullContentPermitted: true,
        readingTimeMinutes: 45, // Full volume reading experience
        publishedAt: '1920-01-01T00:00:00Z', // Canon era
        metadata: {
          gutenbergId: book.id,
          downloadCount: book.download_count,
          languages: book.languages,
          mediaType: book.media_type,
          epubUrl,
          rawTextUrl,
        },
      };
    });
  }
}
