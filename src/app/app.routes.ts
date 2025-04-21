import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { CodexComponent } from './components/codex/codex.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { ArchiveComponent } from './components/archive/archive.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'codex', component: CodexComponent },
  { path: 'projects', component: ProjectsComponent },
  { path: 'archive', component: ArchiveComponent },
  { path: '**', redirectTo: '' },
];
