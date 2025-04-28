import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-skip-preload',
  imports: [],
  templateUrl: './skip-preload.component.html',
  styleUrl: './skip-preload.component.scss',
})
export class SkipPreloadComponent {
  @Output() SkipPreloadEvent = new EventEmitter<void>();

  skipPreload() {
    this.SkipPreloadEvent.emit();
  }
}
