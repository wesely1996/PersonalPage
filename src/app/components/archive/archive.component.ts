import { Component } from '@angular/core';
import { ArchiveSelectionButtonComponent } from './archive-selection-button/archive-selection-button.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-archive',
  imports: [ArchiveSelectionButtonComponent, RouterLink],
  templateUrl: './archive.component.html',
  styleUrl: './archive.component.scss',
})
export class ArchiveComponent {
  showComonent = 'home';

  showComponent(component: string) {
    this.showComonent = component;
  }
}
