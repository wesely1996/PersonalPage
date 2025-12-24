import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PreloaderComponent } from './components/preloader/preloader.component';
import { CommonModule } from '@angular/common';
import { NavigationBarComponent } from './components/navigation-bar/navigation-bar.component';
import { BackgroundComponent } from './components/background/background.component';
import { SkipPreloadComponent } from './components/preloader/skip-preload/skip-preload.component';
import { environment } from '../environments/environment';
import { ProjectsCacheService } from './services/projects-cache/projects-cache.service';
import { CodexCacheService } from './services/codex-cache/codex-cache.service';

@Component({
  selector: 'app-root',
  standalone: true,
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

  isLoading = environment.isLoading;
  isFirstLoadingFinished = environment.isFirstLoadingFinished;

  state = 'loading';
  backgroundState: string = 'matrix';

  constructor(
    private projectsCache: ProjectsCacheService,
    private codexCache: CodexCacheService
  ) {}

  ngOnInit() {
    if (document.readyState === 'complete') {
      this.isLoading = false;
      // Prefetch projects in background to warm cache
      setTimeout(() => {
        this.projectsCache.prefetch();
        this.codexCache.prefetch();
      });
    } else {
      document.addEventListener('readystatechange', () => {
        if (document.readyState === 'complete') {
          this.isLoading = false;
          setTimeout(() => {
            this.projectsCache.prefetch();
            this.codexCache.prefetch();
          });
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
