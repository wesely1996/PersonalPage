import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScreenSizeService } from './services/screen-size.service';
import { PreloaderComponent } from './components/preloader/preloader.component';
import { CommonModule } from '@angular/common';
import { NavigationBarComponent } from './components/navigation-bar/navigation-bar.component';
import { BackgroundComponent } from './components/background/background.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    PreloaderComponent,
    CommonModule,
    NavigationBarComponent,
    BackgroundComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'personal-page';

  isMobile = false;
  isLoading = true; // TODO: this should be true
  isFirstLoadingFinished = false; // TODO: this should be false

  state = 'loading';
  backgroundState: string = 'matrix';

  constructor(private screenSizeService: ScreenSizeService) {}

  ngOnInit() {
    this.screenSizeService.isMobile$.subscribe((isMobile: boolean) => {
      this.isMobile = isMobile;
    });

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
