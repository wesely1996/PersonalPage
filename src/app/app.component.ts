import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PreloaderComponent } from './components/preloader/preloader.component';
import { CommonModule } from '@angular/common';
import { NavigationBarComponent } from './components/navigation-bar/navigation-bar.component';
import { BackgroundComponent } from './components/background/background.component';
import { SkipPreloadComponent } from './components/preloader/skip-preload/skip-preload.component';

@Component({
  selector: 'app-root',
  imports: [
    PreloaderComponent,
    CommonModule,
    NavigationBarComponent,
    BackgroundComponent,
    RouterOutlet,
    SkipPreloadComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'personal-page';

  isLoading = false; // TODO: this should be true on production
  isFirstLoadingFinished = true; // TODO: this should be false on production

  state = 'loading';
  backgroundState: string = 'matrix';

  ngOnInit() {
    if (document.readyState === 'complete') {
      this.isLoading = false;
    } else {
      document.addEventListener('readystatechange', () => {
        if (document.readyState === 'complete') {
          this.isLoading = false;
        }
      });
    }
  }

  ngAfterViewInit() {
    window.onload = () => {
      this.isLoading = false;
    };
  }

  FirstLoadFinished() {
    this.isFirstLoadingFinished = true;
    this.switchAppState('home');
    this.switchBackground('matrix');
  }

  switchBackground(state: string) {
    this.backgroundState = state;
  }

  switchAppState(state: string) {
    this.state = state;
  }
}
