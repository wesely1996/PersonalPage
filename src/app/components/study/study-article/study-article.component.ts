import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import {
  StudyService,
  StudyTocEntry,
  StudyTopic,
} from '../../../services/study/study.service';

// How far below the top of the viewport a heading counts as "current".
const ACTIVE_OFFSET_PX = 96;

@Component({
  selector: 'app-study-article',
  standalone: true,
  templateUrl: './study-article.component.html',
  styleUrl: './study-article.component.scss',
  // Rendered markdown is injected via innerHTML, so styles must not be
  // emulated-scoped; every rule is namespaced under .study-reader instead.
  encapsulation: ViewEncapsulation.None,
})
export class StudyArticleComponent implements OnChanges, OnDestroy {
  @Input() topic: StudyTopic | null = null;

  @ViewChild('scroller') private scroller?: ElementRef<HTMLElement>;

  html: SafeHtml | null = null;
  toc: readonly StudyTocEntry[] = [];
  activeId: string | null = null;
  progress = 0;
  tocOpen = false;
  loading = false;
  error: string | null = null;

  private sub?: Subscription;

  constructor(
    private readonly study: StudyService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['topic'] && this.topic) {
      this.load(this.topic.slug);
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  get activeIndex(): number {
    const h2s = this.toc.filter((e) => e.depth === 2);
    let index = -1;
    for (const entry of this.toc) {
      if (entry.depth === 2) {
        index++;
      }
      if (entry.id === this.activeId) {
        return index;
      }
    }
    return h2s.length ? 0 : -1;
  }

  get sectionCount(): number {
    return this.toc.filter((e) => e.depth === 2).length;
  }

  get activeSectionTitle(): string {
    const h2s = this.toc.filter((e) => e.depth === 2);
    return h2s[this.activeIndex]?.text ?? '';
  }

  private load(slug: string) {
    this.sub?.unsubscribe();
    this.loading = true;
    this.error = null;
    this.html = null;
    this.toc = [];
    this.sub = this.study.getContent(slug).subscribe({
      next: (rendered) => {
        // Content is first-party static markdown shipped with the site.
        this.html = this.sanitizer.bypassSecurityTrustHtml(rendered.html);
        this.toc = rendered.toc;
        this.loading = false;
        setTimeout(() => {
          if (this.scroller) {
            this.scroller.nativeElement.scrollTop = 0;
          }
          this.updatePosition();
        });
      },
      error: () => {
        this.error =
          'This module could not be loaded. Check your connection and open it again.';
        this.loading = false;
      },
    });
  }

  // Queried on demand rather than cached: the body is injected via innerHTML
  // and is not guaranteed to be in the DOM when the content arrives.
  private headingElements(root: HTMLElement): HTMLElement[] {
    return Array.from(
      root.querySelectorAll<HTMLElement>('.study-body h2[id], .study-body h3[id]')
    );
  }

  onScroll() {
    // Scroll events already fire at most once per frame.
    this.updatePosition();
  }

  private updatePosition() {
    const root = this.scroller?.nativeElement;
    if (!root) {
      return;
    }
    const max = root.scrollHeight - root.clientHeight;
    this.progress = max > 0 ? Math.round((root.scrollTop / max) * 100) : 0;

    const top = root.getBoundingClientRect().top + ACTIVE_OFFSET_PX;
    const headings = this.headingElements(root);
    let current: string | null = headings[0]?.id ?? null;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= top) {
        current = heading.id;
      } else {
        break;
      }
    }
    this.activeId = current;
  }

  goTo(id: string) {
    const target = this.scroller?.nativeElement.querySelector<HTMLElement>(
      `#${CSS.escape(id)}`
    );
    if (!target) {
      return;
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    this.tocOpen = false;
  }

  toTop() {
    const root = this.scroller?.nativeElement;
    root?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // In-page "#section" links would otherwise be resolved against the
  // base href and navigate away from the dialog.
  onBodyClick(event: MouseEvent) {
    const anchor = (event.target as HTMLElement).closest('a');
    const href = anchor?.getAttribute('href');
    if (href?.startsWith('#')) {
      event.preventDefault();
      this.goTo(decodeURIComponent(href.slice(1)));
    }
  }

  progressBar(width = 20): string {
    const filled = Math.round((this.progress / 100) * width);
    return '#'.repeat(filled) + '-'.repeat(width - filled);
  }
}
