import { Component } from '@angular/core';
import { DataTableComponent } from '../data-table/data-table.component';
import { environment } from '../../../environments/environment';
import { WorkInProgressComponent } from '../work-in-progress/work-in-progress.component';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [DataTableComponent, WorkInProgressComponent],
  template: `
    <div>
      <!-- <app-data-table [title]="'Library'" [csvUrl]="csv"></app-data-table> -->
      <div class="absolute-position top-8vh flex-center-top">
        <h1 class="text-center text-light mt-4">Library</h1>
      </div>
      <app-work-in-progress></app-work-in-progress>
    </div>
  `,
})
export class LibraryComponent {
  csv = environment.libraryCsvUrl;
}
