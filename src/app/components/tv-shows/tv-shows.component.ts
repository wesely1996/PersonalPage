import { Component } from '@angular/core';
import { DataTableComponent } from '../data-table/data-table.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-tv-shows',
  standalone: true,
  imports: [DataTableComponent],
  template: `
    <div class="absolute-position top-8vh" style="width: 100vw; height: 90vh">
      <app-data-table [title]="'TV Shows'" [csvUrl]="csv"></app-data-table>
    </div>
  `,
})
export class TvShowsComponent {
  csv = environment.tvShowsCsvUrl;
}
