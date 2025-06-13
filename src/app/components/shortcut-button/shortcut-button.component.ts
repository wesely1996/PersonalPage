import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shortcut-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shortcut-button.component.html',
  styleUrls: ['./shortcut-button.component.scss'],
})
export class ShortcutButtonComponent {
  @Input() image: string = 'project-folder-icon';
  @Input() text: string = '';
  @Input() src: string = '';
  @Input() noReroute: boolean = false; // Add this

  constructor(private router: Router) {}

  handleClick() {
    if (!this.noReroute && this.src) {
      this.router.navigate([this.src]);
    }
  }
}
