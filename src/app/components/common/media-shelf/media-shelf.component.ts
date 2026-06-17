import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type MediaKind = 'movie' | 'tv' | 'game';

export type MediaStatus = {
  type: string;
};

export type MediaItem = {
  title: string;
  genre?: string;
  platform?: string;
  score: number;
  year?: number;
  synopsis?: string;
  director?: string;
  creator?: string;
  seasons?: number;
  studio?: string;
  hours?: number;
  status?: MediaStatus;
  link?: string;
};

type IntroPhase = 'glitch' | 'black' | 'crt' | 'ready';

const CASE_COLOR_FALLBACK = '#555555';

const CASE_WIDTH_REM = 5.2;

// Typical vertical scrollbar width; subtracted unconditionally so packing
// stays consistent whether or not the scrollbar happens to be visible yet.
const SCROLLBAR_WIDTH_PX = 17;

@Component({
  selector: 'app-media-shelf',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-shelf.component.html',
  styleUrls: ['./media-shelf.component.scss'],
})
export class MediaShelfComponent implements OnInit {
  @Input() dataUrl!: string;
  @Input() introWord = 'MEDIA';
  @Input() kind: MediaKind = 'movie';
  @Input() colorMap: Record<string, string> = {};

  private allItems: MediaItem[] = [];
  shelves: MediaItem[][] = [];
  selectedItem: MediaItem | null = null;
  introPhase: IntroPhase = 'glitch';

  @ViewChild('shelfScroll') private shelfScrollRef?: ElementRef<HTMLDivElement>;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadItems();
    this.runIntro();
  }

  @HostListener('window:resize')
  onResize() {
    this.buildShelves();
  }

  private loadItems() {
    this.http.get<MediaItem[]>(this.dataUrl).subscribe({
      next: (items) => {
        this.allItems = [...items].sort(
          (a, b) => b.score - a.score || a.title.localeCompare(b.title)
        );
        this.buildShelves();
      },
      error: () => {
        this.shelves = [];
      },
    });
  }

  private buildShelves() {
    if (!this.allItems.length) {
      this.shelves = [];
      return;
    }
    this.shelves = this.packShelves(this.allItems);
  }

  // Greedily pack items onto each shelf based on a fixed CD case width, so a
  // row never overflows into a wrapped second line and is filled as much as
  // possible.
  private packShelves(items: MediaItem[]): MediaItem[][] {
    const remPx = 16;
    const gap = 0.5 * remPx;
    const shelfPadding = remPx; // 0.5rem on each side of .shelf
    const available = this.availableShelfWidth(remPx, shelfPadding);
    const caseWidth = CASE_WIDTH_REM * remPx;

    const shelves: MediaItem[][] = [];
    let current: MediaItem[] = [];
    let currentWidth = 0;

    items.forEach((item) => {
      const widthWithItem =
        currentWidth + (current.length > 0 ? gap : 0) + caseWidth;

      if (current.length > 0 && widthWithItem > available) {
        shelves.push(current);
        current = [];
        currentWidth = 0;
      }

      current.push(item);
      currentWidth += (current.length > 1 ? gap : 0) + caseWidth;
    });

    if (current.length) {
      shelves.push(current);
    }

    return shelves;
  }

  // Measure the real content width of .shelf-scroll rather than estimating
  // from the viewport: this captures the exact resolved padding (including
  // the 5vw side padding) and excludes the scrollbar, so packed shelves
  // match the actual rendered width at any breakpoint or zoom level.
  private availableShelfWidth(remPx: number, shelfPadding: number): number {
    const scrollEl = this.shelfScrollRef?.nativeElement;
    if (scrollEl) {
      const style = getComputedStyle(scrollEl);
      const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      return scrollEl.clientWidth - paddingX - shelfPadding - SCROLLBAR_WIDTH_PX;
    }

    const width = document.documentElement.clientWidth || window.innerWidth;
    const isMobile = width <= 900;
    const sidePadding = isMobile ? remPx : width * 0.05;
    return width - sidePadding * 2 - shelfPadding;
  }

  private runIntro() {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      this.introPhase = 'ready';
      return;
    }

    this.introPhase = 'glitch';
    setTimeout(() => {
      this.introPhase = 'black';
      setTimeout(() => {
        this.introPhase = 'crt';
        setTimeout(() => {
          this.introPhase = 'ready';
        }, 900);
      }, 400);
    }, 700);
  }

  caseColor(item: MediaItem): string {
    const key = item.genre ?? item.platform ?? '';
    return this.colorMap[key] ?? CASE_COLOR_FALLBACK;
  }

  stars(score: number): boolean[] {
    const safe = Math.max(0, Math.min(5, Math.round(score)));
    return Array.from({ length: 5 }, (_, i) => i < safe);
  }

  openCase(item: MediaItem) {
    this.selectedItem = item;
  }

  closeCase() {
    this.selectedItem = null;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.selectedItem) {
      this.closeCase();
    }
  }
}
