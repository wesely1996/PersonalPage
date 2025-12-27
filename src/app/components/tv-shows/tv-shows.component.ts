import { Component } from '@angular/core';
import { DataTableComponent } from '../common/data-table/data-table.component';
import { environment } from '../../../environments/environment';
import { WorkInProgressComponent } from '../work-in-progress/work-in-progress.component';

@Component({
  selector: 'app-tv-shows',
  standalone: true,
  imports: [DataTableComponent, WorkInProgressComponent],
  templateUrl: './tv-shows.component.html',
  styleUrls: ['./tv-shows.component.scss'],
})
export class TvShowsComponent {
  csv = environment.tvShowsCsvUrl;
}
