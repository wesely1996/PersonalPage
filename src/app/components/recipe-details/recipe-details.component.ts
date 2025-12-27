import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { parseDelimitedList } from '../../helpers/parse-delimited-list';

type Ingredient = { name: string; quantity: string };

@Component({
  selector: 'app-recipe-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recipe-details.component.html',
  styleUrl: './recipe-details.component.scss',
})
export class RecipeDetailsComponent {
  @Input() data: any;

  get title(): string {
    return this.data?.title ?? 'Recipe';
  }

  get rating(): number {
    const value = this.data?.rating ?? 0;
    const num = Number(value);
    if (Number.isNaN(num)) return 0;
    return Math.max(0, Math.min(5, Math.round(num)));
  }

  get categories(): string[] {
    return parseDelimitedList(this.data?.categories ?? '');
  }

  get ingredients(): Ingredient[] {
    const raw = this.data?.ingredients ?? '';
    if (!raw || typeof raw !== 'string') return [];
    return raw
      .split(',')
      .map((chunk: string) => chunk.trim())
      .filter(Boolean)
      .map((entry) => {
        const [name, quantity] = entry
          .split(':')
          .map((part) => part?.trim() || '');
        return {
          name: name || entry,
          quantity: quantity || '',
        };
      });
  }

  get steps(): string[] {
    const raw = this.data?.instructions ?? '';
    if (!raw) return [];
    return String(raw)
      .split(/\n+/)
      .map((step: string) => step.trim())
      .filter(Boolean);
  }

  get starSlots(): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < this.rating);
  }
}
