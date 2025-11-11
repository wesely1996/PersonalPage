import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GoogleSheetsService } from '../../services/google-sheets/google-sheets-service.service';

type Row = Record<string, any>;

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
  @Input() csvUrl: string = '';
  @Input() title: string = '';

  // base visible columns (case-insensitive)
  baseColumns = ['name', 'genre', 'rating'];

  rows: Row[] = [];
  filtered: Row[] = [];
  columns: string[] = [];
  query: string = '';
  sortKey: string | null = null;
  sortDir: 'asc' | 'desc' = 'asc';

  constructor(private sheets: GoogleSheetsService) {}

  ngOnInit() {
    if (!this.csvUrl) return;
    this.sheets
      .fetchBooksFromSheet(this.csvUrl)
      .then((data) => {
        this.rows = Array.isArray(data) ? data : [];
        this.buildColumns();
        this.applyFilter();
      })
      .catch(() => {
        this.rows = [];
        this.columns = [];
      });
  }

  buildColumns() {
    const headerSet = new Set<string>();
    for (const row of this.rows) {
      Object.keys(row).forEach((k) => headerSet.add(k));
    }
    const headers = Array.from(headerSet);
    // normalize case matching for base columns
    const map = new Map<string, string>();
    headers.forEach((h) => map.set(h.toLowerCase(), h));
    const base: string[] = this.baseColumns
      .map((b) => map.get(b) || b)
      .filter((h) => headers.includes(h));
    const rest = headers.filter(
      (h) => !base.includes(h)
    );
    this.columns = [...base, ...rest];
  }

  applyFilter() {
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

  sortBy(col: string) {
    if (this.sortKey === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = col;
      this.sortDir = 'asc';
    }
    this.applySort();
  }

  applySort() {
    const key = this.sortKey;
    if (!key) return;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    this.filtered.sort((a, b) => {
      const av = String(a[key] ?? '').toLowerCase();
      const bv = String(b[key] ?? '').toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }
}

