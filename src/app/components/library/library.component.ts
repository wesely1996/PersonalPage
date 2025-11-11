import { Component } from '@angular/core';
import { DataTableComponent } from '../data-table/data-table.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [DataTableComponent],
  template: `
    <div class="absolute-position top-8vh" style="width: 100vw; height: 90vh">
      <app-data-table [title]="'Library'" [csvUrl]="csv"></app-data-table>
    </div>
  `,
})
export class LibraryComponent {
  csv = environment.libraryCsvUrl;
}
