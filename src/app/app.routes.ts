import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { CodexComponent } from './components/codex/codex.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { ArchiveComponent } from './components/archive/archive.component';
import { CookbookComponent } from './components/cookbook/cookbook.component';
import { BlogComponent } from './components/blog/blog.component';
import { MoviesComponent } from './components/movies/movies.component';
import { LibraryComponent } from './components/library/library.component';
import { GamesComponent } from './components/games/games.component';
import { TvShowsComponent } from './components/tv-shows/tv-shows.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'codex', component: CodexComponent },
  { path: 'projects', component: ProjectsComponent },
  { path: 'archive', component: ArchiveComponent },
  { path: 'archive/cookbook', component: CookbookComponent },
  { path: 'archive/blog', component: BlogComponent },
  { path: 'archive/movies', component: MoviesComponent },
  { path: 'archive/library', component: LibraryComponent },
  { path: 'archive/games', component: GamesComponent },
  { path: 'archive/tv-shows', component: TvShowsComponent },
  { path: '**', redirectTo: '' },
];
