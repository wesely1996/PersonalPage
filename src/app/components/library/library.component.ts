import { Component } from '@angular/core';
import { DataTableComponent } from '../data-table/data-table.component';
import { environment } from '../../../environments/environment';
import { WorkInProgressComponent } from '../work-in-progress/work-in-progress.component';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [DataTableComponent, WorkInProgressComponent],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss'],
})
export class LibraryComponent {
  csv = environment.libraryCsvUrl;
}
