import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { GoogleSheetsService } from '../../services/google-sheets/google-sheets-service.service';
import { SearchInputComponent } from '../common/search-input/search-input.component';
import { TerminalDialogComponent } from '../terminal-dialog/terminal-dialog.component';
import { environment } from '../../../environments/environment';
import { parseDelimitedList } from '../../helpers/parse-delimited-list';

type RecipeRow = {
  id?: string;
  title: string;
  ingredients?: string;
  instructions?: string;
  categories?: string[];
  rating: number;
};

type SortKey = 'title' | 'categories' | 'rating';
type SortDirection = 'asc' | 'desc' | null;

@Component({
  selector: 'app-cookbook',
  standalone: true,
  imports: [CommonModule, SearchInputComponent, TerminalDialogComponent],
  templateUrl: './cookbook.component.html',
  styleUrl: './cookbook.component.scss',
})
export class CookbookComponent {
  recipes: RecipeRow[] = [];
  filtered: RecipeRow[] = [];
  selected: RecipeRow | null = null;
  query = '';
  sortKey: SortKey | null = null;
  sortDirection: SortDirection = null;

  constructor(private sheets: GoogleSheetsService) {}

  ngOnInit() {
    const url = environment.cookbookCsvUrl;
    if (!url) return;
    this.sheets
      .fetchBooksFromSheet(url)
      .then((rows) => {
        this.recipes = Array.isArray(rows)
          ? rows
              .map((row) => this.toRecipe(row))
              .filter((r) => !!r.title)
              .sort((a, b) => a.title.localeCompare(b.title))
          : [];
        this.applyFilter();
      })
      .catch(() => {
        this.recipes = [];
        this.filtered = [];
      });
  }

  applyFilter(raw?: string) {
    if (typeof raw === 'string') {
      this.query = raw;
    }
    const q = (this.query ?? '').trim().toLowerCase();
    if (!q) {
      this.filtered = [...this.recipes];
      this.applySort();
      return;
    }
    const numericQuery = Number(q);
    const isRatingSearch =
      !Number.isNaN(numericQuery) &&
      numericQuery >= 1 &&
      numericQuery <= 5 &&
      /^\d$/.test(q);
    if (isRatingSearch) {
      const target = Math.round(numericQuery);
      this.filtered = this.recipes.filter(
        (r) => Math.round(r.rating) === target
      );
      this.applySort();
      return;
    }
    this.filtered = this.recipes.filter((r) => {
      const categories = r.categories?.join(', ') ?? '';
      const haystack = `${r.title} ${r.ingredients ?? ''} ${
        r.instructions ?? ''
      } ${categories}`.toLowerCase();
      return haystack.includes(q);
    });
    this.applySort();
  }

  getStars(rating: number): boolean[] {
    const safe = Math.max(0, Math.min(5, Math.round(rating)));
    return Array.from({ length: 5 }, (_, i) => i < safe);
  }

  openRecipe(r: RecipeRow) {
    this.selected = r;
  }

  closeDialog() {
    this.selected = null;
  }

  toggleSort(key: SortKey) {
    if (this.sortKey !== key) {
      this.sortKey = key;
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

  getSortIndicator(key: SortKey): 'asc' | 'desc' | 'none' {
    if (this.sortKey !== key || !this.sortDirection) {
      return 'none';
    }
    return this.sortDirection;
  }

  private toRecipe(row: any): RecipeRow {
    const title = row?.title ?? '';
    const ingredients = row?.ingredients ?? '';
    const instructions = row?.instructions ?? '';
    const categories = parseDelimitedList(row?.categories);
    const ratingValue = row?.rating ?? 0;
    const rating = Number.isNaN(Number(ratingValue))
      ? 0
      : Math.max(0, Math.min(5, Number(ratingValue)));
    return {
      id: row?.id ?? row?.ID ?? '',
      title,
      ingredients,
      instructions,
      categories,
      rating,
    };
  }

  private applySort() {
    if (!this.sortKey || !this.sortDirection) return;
    const direction = this.sortDirection === 'asc' ? 1 : -1;
    this.filtered = [...this.filtered].sort((a, b) => {
      if (this.sortKey === 'rating') {
        return (a.rating - b.rating) * direction;
      }
      const left =
        this.sortKey === 'title'
          ? a.title
          : (a.categories ?? []).join(', ');
      const right =
        this.sortKey === 'title'
          ? b.title
          : (b.categories ?? []).join(', ');
      return left.localeCompare(right) * direction;
    });
  }

}
