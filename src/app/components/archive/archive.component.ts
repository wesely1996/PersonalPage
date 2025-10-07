import { Component } from '@angular/core';
import { WorkInProgressComponent } from '../work-in-progress/work-in-progress.component';

@Component({
  selector: 'app-archive',
  imports: [WorkInProgressComponent],
  templateUrl: './archive.component.html',
  styleUrl: './archive.component.scss',
})
export class ArchiveComponent {
  showComonent = 'home';

  showComponent(component: string) {
    this.showComonent = component;
  }
}
