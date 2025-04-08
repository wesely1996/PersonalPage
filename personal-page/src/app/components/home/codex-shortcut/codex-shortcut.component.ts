import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-codex-shortcut',
  imports: [CommonModule, RouterModule],
  templateUrl: './codex-shortcut.component.html',
  styleUrls: ['./codex-shortcut.component.scss'],
})
export class CodexShortcutComponent {
  avatarUrl: string = 'avatar.png';
  name: string = 'Nikola Veselinović';
  title: string = 'Software Development Engineer';
  degree: string = 'Bachelor in Computer Science';
}
