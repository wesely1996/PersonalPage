import { Component } from '@angular/core';
import { ShortcutButtonComponent } from '../shortcut-button/shortcut-button.component';
import { BookTableComponent } from './book-table/book-table.component';

@Component({
  selector: 'app-archive',
  imports: [ShortcutButtonComponent, BookTableComponent],
  templateUrl: './archive.component.html',
  styleUrl: './archive.component.scss',
})
export class ArchiveComponent {
  showComonent = 'home';

  showComponent(component: string) {
    this.showComonent = component;
  }
}
