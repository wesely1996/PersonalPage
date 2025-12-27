import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { GoogleSheetsService } from '../../../services/google-sheets/google-sheets-service.service';
import { SearchInputComponent } from '../search-input/search-input.component';

type Row = Record<string, any>;
type SortDirection = 'asc' | 'desc' | null;

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, SearchInputComponent],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
  @Input() csvUrl: string = '';
  @Input() title: string = '';
  @Input() columns: string[] = [];
  @Input() tableWidth = '80vw';
  @Input() tableHeight = '80vh';

  rows: Row[] = [];
  filtered: Row[] = [];
  query: string = '';
  sortKey: string | null = null;
  sortDirection: SortDirection = null;

  constructor(private sheets: GoogleSheetsService) {}

  ngOnInit() {
    if (!this.csvUrl) return;
    this.sheets
      .fetchBooksFromSheet(this.csvUrl)
      .then((data: Row[] | unknown) => {
        this.rows = Array.isArray(data) ? data : [];
        this.applyFilter();
      })
      .catch(() => {
        this.rows = [];
        this.filtered = [];
      });
  }

  applyFilter(raw?: string) {
    if (typeof raw === 'string') {
      this.query = raw;
    }
    const q = this.query.trim().toLowerCase();
    if (!q) {
      this.filtered = [...this.rows];
    } else {
      this.filtered = this.rows.filter((r) =>
        this.columns.some((c) => String(r[c] ?? '').toLowerCase().includes(q))
      );
    }
    this.applySort();
  }

  toggleSort(col: string) {
    if (this.sortKey !== col) {
      this.sortKey = col;
      this.sortDirection = 'desc';
      this.applyFilter();
      return;
    }
    if (this.sortDirection === 'desc') {
      this.sortDirection = 'asc';
      this.applyFilter();
      return;
    }
    if (this.sortDirection === 'asc') {
      this.sortKey = null;
      this.sortDirection = null;
      this.applyFilter();
      return;
    }
    this.sortDirection = 'desc';
    this.applyFilter();
  }

  getSortIndicator(col: string): 'asc' | 'desc' | 'none' {
    if (this.sortKey !== col || !this.sortDirection) {
      return 'none';
    }
    return this.sortDirection;
  }

  applySort() {
    const key = this.sortKey;
    if (!key || !this.sortDirection) return;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.filtered = [...this.filtered].sort((a, b) => {
      const av = String(a[key] ?? '').toLowerCase();
      const bv = String(b[key] ?? '').toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }
}
