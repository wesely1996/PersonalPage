import { Component, Input, OnChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Component({
  selector: 'app-article',
  standalone: true,
  templateUrl: './article.component.html',
  styleUrls: ['./article.component.scss'],
})
export class ArticleComponent implements OnChanges {
  @Input() address: string = '';

  content: SafeHtml = '';

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    if (this.address) {
      this.loadMarkdown(this.address);
    }
  }

  loadMarkdown(url: string) {
    this.http.get(url, { responseType: 'text' }).subscribe({
      next: async (markdown) => {
        const html = await marked(markdown);
        this.content = this.sanitizer.bypassSecurityTrustHtml(html);
      },
      error: (err) => {
        this.content = this.sanitizer.bypassSecurityTrustHtml(
          `<p style="color:red;">Error loading article: ${err.message}</p>`
        );
      },
    });
  }
}
