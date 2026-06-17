import { Component } from '@angular/core';
import { MediaShelfComponent } from '../common/media-shelf/media-shelf.component';

const MOVIE_GENRE_COLORS: Record<string, string> = {
  'Sci-Fi': '#1a3a5c',
  Drama: '#1a4a3a',
  Action: '#7a1a1a',
  Comedy: '#6b5a00',
  Horror: '#2a0a2a',
  'Mystery/Thriller': '#2a2a4a',
  Romance: '#6b1a3a',
  Animation: '#4a3000',
};

@Component({
  selector: 'app-movies',
  standalone: true,
  imports: [MediaShelfComponent],
  templateUrl: './movies.component.html',
  styleUrls: ['./movies.component.scss'],
})
export class MoviesComponent {
  readonly genreColors = MOVIE_GENRE_COLORS;
}
