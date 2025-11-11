import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-archive-selection-button',
  standalone: true,
  imports: [],
  templateUrl: './archive-selection-button.component.html',
  styleUrl: './archive-selection-button.component.scss',
})
export class ArchiveSelectionButtonComponent {
  @Input() label: string = '';
}

