import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ProjectSelectionButtonComponent } from './project-selection-button/project-selection-button.component';
import { TerminalDialogComponent } from '../terminal-dialog/terminal-dialog.component';
import { CommonModule } from '@angular/common';

interface Project {
  id: number;
  name: string;
  yearStarted: number;
  yearFinished?: number;
  component: string;
  link?: string;
}

@Component({
  selector: 'app-projects',
  imports: [
    ProjectSelectionButtonComponent,
    TerminalDialogComponent,
    CommonModule,
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent {
  projects: Project[] = [];
  selectedProject: Project | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<Project[]>('json/projects.json').subscribe((data) => {
      this.projects = data.sort((a, b) =>
        a.yearStarted > b.yearStarted
          ? -1
          : b.yearStarted > a.yearStarted
          ? 1
          : 0
      );
    });
  }

  openProject(projectId: number) {
    var project = this.projects.find((p) => p.id === projectId);
    this.selectedProject = project || null;
  }

  closeDialog() {
    this.selectedProject = null;
  }
}
