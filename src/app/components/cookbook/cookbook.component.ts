import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { GoogleSheetsService } from '../../services/google-sheets/google-sheets-service.service';
import { TerminalDialogComponent } from '../terminal-dialog/terminal-dialog.component';
import { environment } from '../../../environments/environment';

type RecipeRow = {
  id?: string;
  title: string;
  ingredients?: string;
  instructions?: string;
  rating: number;
};

@Component({
  selector: 'app-cookbook',
  standalone: true,
  imports: [CommonModule, TerminalDialogComponent],
  templateUrl: './cookbook.component.html',
  styleUrl: './cookbook.component.scss',
})
export class CookbookComponent {
  recipes: RecipeRow[] = [];
  filtered: RecipeRow[] = [];
  selected: RecipeRow | null = null;
  query = '';

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
      return;
    }
    const numericQuery = Number(q);
    const isRatingSearch =
      !Number.isNaN(numericQuery) && numericQuery >= 1 && numericQuery <= 5 && /^\d$/.test(q);
    if (isRatingSearch) {
      const target = Math.round(numericQuery);
      this.filtered = this.recipes.filter((r) => Math.round(r.rating) === target);
      return;
    }
    this.filtered = this.recipes.filter((r) => {
      const haystack =
        `${r.title} ${r.ingredients ?? ''} ${r.instructions ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
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

  private toRecipe(row: any): RecipeRow {
    const title = row?.title ?? row?.Title ?? row?.Name ?? '';
    const ingredients = row?.ingredients ?? row?.Ingredients ?? '';
    const instructions = row?.instructions ?? row?.Instructions ?? row?.Steps ?? '';
    const ratingValue = row?.Rating ?? row?.rating ?? row?.score ?? row?.Score ?? 0;
    const rating = Number.isNaN(Number(ratingValue))
      ? 0
      : Math.max(0, Math.min(5, Number(ratingValue)));
    return {
      id: row?.id ?? row?.ID ?? '',
      title,
      ingredients,
      instructions,
      rating,
    };
  }
}
