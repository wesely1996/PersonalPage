import {
  Component,
  OnInit,
  Signal,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

type BookStatus =
  | { type: 'Finished' }
  | { type: 'To Read' }
  | { type: 'Reading'; current_chapter: string }
  | { type: 'Paused' | 'Dropped'; last_chapter_read: string };

interface Book {
  title: string;
  author: string;
  genre: string;
  status: BookStatus;
  link?: string;
}

@Component({
  selector: 'app-book-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './book-table.component.html',
  styleUrls: ['./book-table.component.scss'],
})
export class BookTableComponent implements OnInit {
  private http = inject(HttpClient);

  books = signal<Book[]>([]);
  sortPriority = signal<string[]>(['status', 'title', 'author', 'genre']);
  searchValue = signal('');

  statusOrder: Record<string, number> = {
    Reading: 0,
    'To Read': 1,
    Paused: 2,
    Finished: 3,
    Dropped: 4,
  };

  filteredBooks: Signal<Book[]> = computed(() => {
    const term = this.searchValue().toLowerCase();
    const sorted = [...this.books()].sort((a, b) => {
      for (const key of this.sortPriority()) {
        let aVal = this.getSortValue(a, key);
        let bVal = this.getSortValue(b, key);
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
      }
      return 0;
    });

    return sorted.filter((b) => {
      const status = b.status.type;
      const fields = [
        b.title,
        b.author,
        b.genre,
        status,
        'current_chapter' in b.status ? b.status.current_chapter : '',
        'last_chapter_read' in b.status ? b.status.last_chapter_read : '',
      ];
      return fields.some((f) => f.toLowerCase().includes(term));
    });
  });

  ngOnInit() {
    this.http.get<Book[]>('/json/books.json').subscribe((data) => {
      this.books.set(data);
    });
  }

  getSortValue(book: Book, key: string): string | number {
    switch (key) {
      case 'status':
        return this.statusOrder[book.status.type];
      default:
        return (book as any)[key]?.toLowerCase?.() ?? '';
    }
  }

  updateSort(key: string) {
    const priority = [...this.sortPriority()];
    const index = priority.indexOf(key);
    if (index >= 0) priority.splice(index, 1);
    priority.unshift(key);
    this.sortPriority.set(priority);
  }

  getStatusDisplay(status: BookStatus): string {
    switch (status.type) {
      case 'Reading':
        return `Reading (${status.current_chapter})`;
      case 'Paused':
      case 'Dropped':
        return `${status.type} (${status.last_chapter_read})`;
      default:
        return status.type;
    }
  }

  goTolink(link: string) {
    window.open(link, '_blank');
  }
}
