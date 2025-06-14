import { Component } from '@angular/core';
import { WeatherComponent } from './weather/weather.component';
import { ShortcutButtonComponent } from '../shortcut-button/shortcut-button.component';
import { CodexShortcutComponent } from './codex-shortcut/codex-shortcut.component';
import { AnalogClockComponent } from './analog-clock/analog-clock.component';
import { HackerRunGameComponent } from './hacker-run-game/hacker-run-game.component';

@Component({
  selector: 'app-home',
  imports: [
    WeatherComponent,
    CodexShortcutComponent,
    ShortcutButtonComponent,
    AnalogClockComponent,
    HackerRunGameComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
