import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { GoogleSheetsService } from '../../services/google-sheets/google-sheets-service.service';
import { TerminalDialogComponent } from '../terminal-dialog/terminal-dialog.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-cookbook',
  standalone: true,
  imports: [CommonModule, TerminalDialogComponent],
  templateUrl: './cookbook.component.html',
  styleUrl: './cookbook.component.scss',
})
export class CookbookComponent {
  recipes: any[] = [];
  selected: any | null = null;

  constructor(private sheets: GoogleSheetsService) {}

  ngOnInit() {
    const url = environment.cookbookCsvUrl;
    if (!url) return;
    this.sheets
      .fetchBooksFromSheet(url)
      .then((rows) => (this.recipes = rows))
      .catch(() => (this.recipes = []));
  }

  openRecipe(r: any) {
    this.selected = r;
  }

  closeDialog() {
    this.selected = null;
  }
}
