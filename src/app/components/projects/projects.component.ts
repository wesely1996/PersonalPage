import { Component } from '@angular/core';
import { ProjectSelectionButtonComponent } from './project-selection-button/project-selection-button.component';
import { TerminalDialogComponent } from '../terminal-dialog/terminal-dialog.component';
import { CommonModule } from '@angular/common';
import { ProjectsCacheService, Project } from '../../services/projects-cache/projects-cache.service';

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

  constructor(
    private projectsCache: ProjectsCacheService
  ) {}

  ngOnInit() {
    this.projectsCache.getProjects().then((data) => {
      this.projects = data;
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
