import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-shortcut-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shortcut-button.component.html',
  styleUrls: ['./shortcut-button.component.scss'],
})
export class ShortcutButtonComponent {
  @Input() text: string = '';
  @Input() src: string = '';
}
