import { Component } from '@angular/core';
import { DataTableComponent } from '../common/data-table/data-table.component';
import { environment } from '../../../environments/environment';
import { WorkInProgressComponent } from '../work-in-progress/work-in-progress.component';

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [DataTableComponent, WorkInProgressComponent],
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.scss'],
})
export class GamesComponent {
  csv = environment.gamesCsvUrl;
}
