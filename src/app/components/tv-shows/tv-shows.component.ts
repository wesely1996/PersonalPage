import { Component } from '@angular/core';
import { MediaShelfComponent } from '../common/media-shelf/media-shelf.component';

const TV_GENRE_COLORS: Record<string, string> = {
  Drama: '#1a4a3a',
  Crime: '#4a1a1a',
  Animation: '#4a3000',
  Comedy: '#6b5a00',
  'Sci-Fi': '#1a3a5c',
  Fantasy: '#3a1a5c',
  Thriller: '#2a2a4a',
  Documentary: '#2e4a2e',
  Horror: '#2a0a2a',
};

@Component({
  selector: 'app-tv-shows',
  standalone: true,
  imports: [MediaShelfComponent],
  templateUrl: './tv-shows.component.html',
  styleUrls: ['./tv-shows.component.scss'],
})
export class TvShowsComponent {
  readonly genreColors = TV_GENRE_COLORS;
}
