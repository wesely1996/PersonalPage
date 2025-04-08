import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-projects-button',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './projects-button.component.html',
  styleUrls: ['./projects-button.component.scss'],
})
export class ProjectsButtonComponent {}
