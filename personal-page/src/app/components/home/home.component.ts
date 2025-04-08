import { Component } from '@angular/core';
import { WeatherComponent } from './weather/weather.component';
import { ProjectsButtonComponent } from './projects-button/projects-button.component';
import { CodexShortcutComponent } from './codex-shortcut/codex-shortcut.component';
import { AnalogClockComponent } from './analog-clock/analog-clock.component';
import { DinoGameComponent } from './dino-game/dino-game.component';

@Component({
  selector: 'app-home',
  imports: [
    WeatherComponent,
    CodexShortcutComponent,
    ProjectsButtonComponent,
    AnalogClockComponent,
    DinoGameComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
