import { Component } from '@angular/core';
import { MediaShelfComponent } from '../common/media-shelf/media-shelf.component';

const GAME_GENRE_COLORS: Record<string, string> = {
  RPG: '#3a1a5c',
  'Action RPG': '#5c1a4a',
  FPS: '#5c1a1a',
  'Action-Adventure': '#5c3a00',
  Platformer: '#005c4a',
  Roguelike: '#1a005c',
  Strategy: '#1a3a00',
  Simulation: '#1a3a3a',
  Sports: '#003a5c',
  Puzzle: '#2a4a1a',
  Fighting: '#4a1a00',
};

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [MediaShelfComponent],
  templateUrl: './games.component.html',
  styleUrls: ['./games.component.scss'],
})
export class GamesComponent {
  readonly genreColors = GAME_GENRE_COLORS;
}
