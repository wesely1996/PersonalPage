import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/home/home.component').then(
        (m) => m.HomeComponent
      ),
  },
  {
    path: 'codex',
    loadComponent: () =>
      import('./components/codex/codex.component').then(
        (m) => m.CodexComponent
      ),
  },
  {
    path: 'projects',
    loadComponent: () =>
      import('./components/projects/projects.component').then(
        (m) => m.ProjectsComponent
      ),
  },
  {
    path: 'archive',
    loadComponent: () =>
      import('./components/archive/archive.component').then(
        (m) => m.ArchiveComponent
      ),
  },
  {
    path: 'archive/cookbook',
    loadComponent: () =>
      import('./components/cookbook/cookbook.component').then(
        (m) => m.CookbookComponent
      ),
  },
  {
    path: 'archive/blog',
    loadComponent: () =>
      import('./components/blog/blog.component').then((m) => m.BlogComponent),
  },
  {
    path: 'archive/movies',
    loadComponent: () =>
      import('./components/movies/movies.component').then(
        (m) => m.MoviesComponent
      ),
  },
  {
    path: 'archive/library',
    loadComponent: () =>
      import('./components/library/library.component').then(
        (m) => m.LibraryComponent
      ),
  },
  {
    path: 'archive/games',
    loadComponent: () =>
      import('./components/games/games.component').then(
        (m) => m.GamesComponent
      ),
  },
  {
    path: 'archive/tv-shows',
    loadComponent: () =>
      import('./components/tv-shows/tv-shows.component').then(
        (m) => m.TvShowsComponent
      ),
  },
  { path: '**', redirectTo: '' },
];
