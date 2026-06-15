import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';

type BookStatus = {
  type: string;
  current_chapter?: string;
  last_chapter_read?: string;
};

type Book = {
  title: string;
  author: string;
  genre: string;
  score: number;
  year?: number;
  synopsis?: string;
  quote?: string;
  status?: BookStatus;
  link?: string;
};

type IntroPhase = 'glitch' | 'black' | 'crt' | 'ready';

const GENRE_COLORS: Record<string, string> = {
  Dystopian: '#6e7f80',
  'Sci-Fi': '#2c5f9e',
  Fantasy: '#5e35b1',
  Fiction: '#8d6e63',
  'Non-Fiction': '#2e7d32',
  'Mystery/Thriller': '#b71c1c',
  Horror: '#1a1a1a',
  Romance: '#c2185b',
  History: '#8e6c3a',
  Biography: '#00695c',
};

const GENRE_COLOR_FALLBACK = '#555555';

const SPINE_BASE_WIDTH_REM = 2.6;
const SPINE_EXTRA_WIDTH_PER_LINE_REM = 1.4;
const SPINE_CHARS_PER_LINE = 14;
const SPINE_MAX_LINES = 3;
// .book-spine is content-box, so its horizontal padding (0.25rem each side)
// adds to the rendered width on top of the `width` style binding.
const SPINE_PADDING_X_REM = 0.5;

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss'],
})
export class LibraryComponent implements OnInit {
  private allBooks: Book[] = [];
  shelves: Book[][] = [];
  selectedBook: Book | null = null;
  introPhase: IntroPhase = 'glitch';

  @ViewChild('shelfScroll') private shelfScrollRef?: ElementRef<HTMLDivElement>;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadBooks();
    this.runIntro();
  }

  @HostListener('window:resize')
  onResize() {
    this.buildShelves();
  }

  private loadBooks() {
    this.http.get<Book[]>('json/books.json').subscribe({
      next: (books) => {
        this.allBooks = [...books].sort(
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
    if (!this.allBooks.length) {
      this.shelves = [];
      return;
    }
    this.shelves = this.packShelves(this.allBooks);
  }

  // Greedily pack books onto each shelf based on each book's actual spine
  // width, so a row never overflows into a wrapped second line and is
  // filled as much as possible.
  private packShelves(books: Book[]): Book[][] {
    const remPx = 16;
    const gap = 0.5 * remPx;
    const shelfPadding = remPx; // 0.5rem on each side of .shelf
    const available = this.availableShelfWidth(remPx, shelfPadding);

    const shelves: Book[][] = [];
    let current: Book[] = [];
    let currentWidth = 0;

    books.forEach((book) => {
      const bookWidth = (this.spineWidth(book.title) + SPINE_PADDING_X_REM) * remPx;
      const widthWithBook =
        currentWidth + (current.length > 0 ? gap : 0) + bookWidth;

      if (current.length > 0 && widthWithBook > available) {
        shelves.push(current);
        current = [];
        currentWidth = 0;
      }

      current.push(book);
      currentWidth += (current.length > 1 ? gap : 0) + bookWidth;
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
      return scrollEl.clientWidth - paddingX - shelfPadding;
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

  spineColor(genre: string): string {
    return GENRE_COLORS[genre] ?? GENRE_COLOR_FALLBACK;
  }

  // Longer titles wrap onto extra vertical lines, so widen the spine to
  // give each line room and make the book look thicker.
  spineWidth(title: string): number {
    const lines = Math.min(
      SPINE_MAX_LINES,
      Math.max(1, Math.ceil(title.length / SPINE_CHARS_PER_LINE))
    );
    return SPINE_BASE_WIDTH_REM + (lines - 1) * SPINE_EXTRA_WIDTH_PER_LINE_REM;
  }

  stars(score: number): boolean[] {
    const safe = Math.max(0, Math.min(5, Math.round(score)));
    return Array.from({ length: 5 }, (_, i) => i < safe);
  }

  openBook(book: Book) {
    this.selectedBook = book;
  }

  closeBook() {
    this.selectedBook = null;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.selectedBook) {
      this.closeBook();
    }
  }
}
