import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { environment } from '../../../environments/environment';
import { GoogleSheetsService } from '../../services/google-sheets/google-sheets-service.service';

type BlogRow = Record<string, unknown>;

interface BlogPost {
  readonly id: string;
  readonly title: string;
  readonly date: Date;
  readonly displayDate: string;
  readonly html: SafeHtml;
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.scss',
})
export class BlogComponent {
  posts: BlogPost[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private readonly sheets: GoogleSheetsService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadPosts();
  }

  private async loadPosts() {
    const url = environment.blogCsvUrl;
    if (!url) {
      this.error = 'No blog source configured.';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const rows = await this.sheets.fetchBooksFromSheet(url);
      const mapped = await Promise.all(rows.map((row) => this.mapRow(row)));
      this.posts = mapped
        .filter((p): p is BlogPost => !!p)
        .sort((a, b) => {
          const dateDiff = b.date.getTime() - a.date.getTime();
          if (dateDiff !== 0) return dateDiff;
          return this.compareIds(b.id, a.id);
        });
    } catch (_err) {
      this.error = 'Failed to load blog posts.';
      this.posts = [];
    } finally {
      this.loading = false;
    }
  }

  private async mapRow(row: BlogRow): Promise<BlogPost | null> {
    const normalized = new Map<string, string>();
    Object.entries(row || {}).forEach(([key, value]) => {
      normalized.set(key.trim().toLowerCase(), String(value ?? '').trim());
    });

    const id = normalized.get('id') ?? '';
    const title = normalized.get('title') ?? '';
    const dateValue = normalized.get('date') ?? '';
    const content = normalized.get('content') ?? '';

    const parsedDate = this.parseDate(dateValue);
    if (!title || !content || !parsedDate) {
      return null;
    }

    const html = await marked.parse(content);
    return {
      id,
      title,
      date: parsedDate,
      displayDate: this.formatDate(parsedDate),
      html: this.sanitizer.bypassSecurityTrustHtml(html),
    };
  }

  private formatDate(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  private parseDate(value: string): Date | null {
    const parts = value.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const [dd, mm, yyyy] = parts.map((v) => Number(v));
    if (!dd || !mm || !yyyy) {
      return null;
    }
    const date = new Date(yyyy, mm - 1, dd);
    return date.getDate() === dd &&
      date.getMonth() === mm - 1 &&
      date.getFullYear() === yyyy
      ? date
      : null;
  }

  private compareIds(a: string, b: string): number {
    const numA = Number(a);
    const numB = Number(b);
    const bothNumeric = !Number.isNaN(numA) && !Number.isNaN(numB);
    if (bothNumeric) {
      return numA - numB;
    }
    return a.localeCompare(b);
  }
}
