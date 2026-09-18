import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs';
import { Marked, Tokens } from 'marked';

export interface StudyTopic {
  readonly slug: string;
  readonly track: string;
  readonly title: string;
  readonly summary: string;
  readonly from: string;
  readonly to: string;
  readonly readingMinutes: number;
  readonly figures: number;
  readonly tags: readonly string[];
}

export interface StudyTocEntry {
  readonly id: string;
  readonly text: string;
  readonly depth: 2 | 3;
}

export interface RenderedStudy {
  readonly html: string;
  readonly toc: readonly StudyTocEntry[];
}

const MANIFEST_URL = 'json/study.json';
const CALLOUT_KINDS = ['tip', 'note', 'warning', 'exercise'] as const;

export function studyContentUrl(slug: string): string {
  return `study/${slug}/index.md`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z0-9#]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Renders study markdown into HTML with heading anchors, captioned figures,
 * labelled callouts and language-tagged code blocks, and collects a table of
 * contents from the h2/h3 headings.
 */
export function renderStudyMarkdown(markdown: string): RenderedStudy {
  const toc: StudyTocEntry[] = [];
  const usedIds = new Map<string, number>();
  let figureCount = 0;

  const uniqueId = (base: string): string => {
    const seed = base || 'section';
    const seen = usedIds.get(seed) ?? 0;
    usedIds.set(seed, seen + 1);
    return seen === 0 ? seed : `${seed}-${seen}`;
  };

  const parser = new Marked({ gfm: true });
  parser.use({
    renderer: {
      heading({ tokens, depth }: Tokens.Heading): string {
        const inner = this.parser.parseInline(tokens);
        const text = decodeEntities(inner.replace(/<[^>]+>/g, '')).trim();
        const id = uniqueId(slugify(text));
        if (depth === 2 || depth === 3) {
          toc.push({ id, text, depth });
        }
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      link({ href, title, tokens }: Tokens.Link): string {
        const text = this.parser.parseInline(tokens);
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        const external = /^https?:\/\//i.test(href)
          ? ' target="_blank" rel="noopener noreferrer"'
          : '';
        return `<a href="${escapeHtml(href)}"${titleAttr}${external}>${text}</a>`;
      },
      image({ href, title, text }: Tokens.Image): string {
        figureCount += 1;
        // Numbering is automatic, so drop any "Figure 3:" the author typed.
        title = (title ?? '').replace(/^fig(ure)?\.?\s*\d+\s*[:.-]\s*/i, '');
        const img = `<img src="${escapeHtml(href)}" alt="${escapeHtml(
          text
        )}" loading="lazy" decoding="async">`;
        const caption = title
          ? `<figcaption><span class="fig-no">Figure ${figureCount}.</span> ${escapeHtml(
              title
            )}</figcaption>`
          : '';
        return `<figure class="study-figure"><a href="${escapeHtml(
          href
        )}" target="_blank" rel="noopener" title="Open full size">${img}</a>${caption}</figure>`;
      },
      paragraph({ tokens }: Tokens.Paragraph): string | false {
        // A paragraph holding only an image renders as a bare figure,
        // since <figure> may not live inside <p>.
        if (tokens.length === 1 && tokens[0].type === 'image') {
          return this.parser.parseInline(tokens) + '\n';
        }
        return false;
      },
      blockquote({ tokens }: Tokens.Blockquote): string {
        const body = this.parser.parse(tokens);
        const match = body.match(
          /^\s*<p><strong>(TIP|NOTE|WARNING|EXERCISE):?<\/strong>:?\s*/i
        );
        const kind = match?.[1].toLowerCase();
        if (!match || !kind || !CALLOUT_KINDS.includes(kind as never)) {
          return `<blockquote>${body}</blockquote>\n`;
        }
        const rest = '<p>' + body.slice(match[0].length);
        return `<aside class="callout callout-${kind}" role="note"><div class="callout-label">${kind}</div>${rest}</aside>\n`;
      },
      code({ text, lang }: Tokens.Code): string {
        const language = (lang ?? '').split(/\s+/)[0] || 'text';
        return `<div class="code-block"><div class="code-lang">${escapeHtml(
          language
        )}</div><pre><code class="language-${escapeHtml(
          language
        )}">${escapeHtml(text)}</code></pre></div>\n`;
      },
      table(token: Tokens.Table): string | false {
        // Wrap tables so wide ones scroll instead of stretching the page.
        const html = renderTable(this.parser, token);
        return `<div class="table-wrap">${html}</div>\n`;
      },
    },
  });

  const html = parser.parse(markdown, { async: false }) as string;
  return { html, toc };
}

// Mirrors marked's default table renderer so the wrapper can be added.
function renderTable(
  parser: { parseInline(tokens: Tokens.Generic[]): string },
  token: Tokens.Table
): string {
  const cell = (c: Tokens.TableCell, header: boolean): string => {
    const tag = header ? 'th' : 'td';
    const align = c.align ? ` align="${c.align}"` : '';
    return `<${tag}${align}>${parser.parseInline(c.tokens)}</${tag}>`;
  };
  const head = `<tr>${token.header.map((c) => cell(c, true)).join('')}</tr>`;
  const rows = token.rows
    .map((row) => `<tr>${row.map((c) => cell(c, false)).join('')}</tr>`)
    .join('');
  return `<table><thead>${head}</thead>${
    rows ? `<tbody>${rows}</tbody>` : ''
  }</table>`;
}

@Injectable({ providedIn: 'root' })
export class StudyService {
  private topics$?: Observable<StudyTopic[]>;

  constructor(private readonly http: HttpClient) {}

  getTopics(): Observable<StudyTopic[]> {
    this.topics$ ??= this.http
      .get<StudyTopic[]>(MANIFEST_URL)
      .pipe(
        catchError((err) => {
          // Drop the cached stream so the next visit retries.
          this.topics$ = undefined;
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    return this.topics$;
  }

  getContent(slug: string): Observable<RenderedStudy> {
    return this.http
      .get(studyContentUrl(slug), { responseType: 'text' })
      .pipe(map((markdown) => renderStudyMarkdown(markdown)));
  }
}
