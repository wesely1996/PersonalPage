import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

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
    return this.data?.title ?? this.data?.Title ?? this.data?.Name ?? 'Recipe';
  }

  get rating(): number {
    const value =
      this.data?.Rating ??
      this.data?.rating ??
      this.data?.score ??
      this.data?.Score ??
      0;
    const num = Number(value);
    if (Number.isNaN(num)) return 0;
    return Math.max(0, Math.min(5, Math.round(num)));
  }

  get ingredients(): Ingredient[] {
    const raw = this.data?.ingredients ?? this.data?.Ingredients ?? '';
    if (!raw || typeof raw !== 'string') return [];
    return raw
      .split(',')
      .map((chunk: string) => chunk.trim())
      .filter(Boolean)
      .map((entry) => {
        const [name, quantity] = entry.split(':').map((part) => part?.trim() || '');
        return {
          name: name || entry,
          quantity: quantity || '',
        };
      });
  }

  get steps(): string[] {
    const raw =
      this.data?.instructions ?? this.data?.Instructions ?? this.data?.Steps ?? '';
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
