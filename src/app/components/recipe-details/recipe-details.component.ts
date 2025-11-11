import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-recipe-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recipe-details.component.html',
  styleUrl: './recipe-details.component.scss',
})
export class RecipeDetailsComponent {
  @Input() data: any;

  get otherEntries(): Array<{ key: string; value: any }> {
    if (!this.data) return [];
    const skip = new Set(['Name', 'name', 'Description', 'Ingredients', 'Steps']);
    return Object.keys(this.data)
      .filter((k) => !skip.has(k))
      .map((k) => ({ key: k, value: this.data[k] }));
  }
}
