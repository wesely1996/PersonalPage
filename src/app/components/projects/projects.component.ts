import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ProjectSelectionButtonComponent } from './project-selection-button/project-selection-button.component';
import { TerminalDialogComponent } from '../terminal-dialog/terminal-dialog.component';
import { CommonModule } from '@angular/common';
import { GoogleSheetsService } from '../../services/google-sheets/google-sheets-service.service';

const ProjectsCsvUrl: string =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTP-z6WUTLlI8o8mO-QVkZ_n1A3fxyCYShPCnLpe89-5cnMIiPBq8x0uRUO8mie_4OPtrKxpyFdLTS4/pub?output=csv&gid=0';

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

  constructor(
    private http: HttpClient,
    private sheetService: GoogleSheetsService
  ) {}

  ngOnInit() {
    this.sheetService
      .fetchBooksFromSheet(ProjectsCsvUrl)
      .then((data: Project[]) => {
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
