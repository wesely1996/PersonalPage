import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-project-selection-button',
  imports: [],
  templateUrl: './project-selection-button.component.html',
  styleUrl: './project-selection-button.component.scss',
})
export class ProjectSelectionButtonComponent {
  @Input()
  projectName: string = '';
  @Input()
  startDate: number | null = null;
  @Input()
  endDate: number | null = null;
}
