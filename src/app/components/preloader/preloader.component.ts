import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-preloader',
  standalone: true,
  imports: [],
  templateUrl: './preloader.component.html',
  styleUrl: './preloader.component.scss',
})
export class PreloaderComponent implements OnInit {
  @Input() text: string =
    'HELLO\nMY NAME IS NIKOLA VESELINOVIĆ\nI AM A SOFTWARE ENGINEER\nWELCOME TO MY PERSONAL PAGE...';
  @Input() speed: number = 80; // Typing speed in milliseconds

  @Output() FirstLoadingFinished = new EventEmitter<void>();

  public displayedText: string = '';
  private index: number = 0;

  ngOnInit() {
    this.startTyping();
  }

  startTyping() {
    const interval = setInterval(() => {
      if (this.index < this.text.length) {
        this.displayedText += this.text[this.index];
        this.index++;
      } else {
        clearInterval(interval);
        setTimeout(() => this.clearText(), 2000); // Clear text after 4 seconds
      }
    }, this.speed);
  }

  clearText() {
    const deleteInterval = setInterval(() => {
      if (this.displayedText.length > 0) {
        this.displayedText = this.displayedText.slice(0, -1);
      } else {
        clearInterval(deleteInterval);
        setTimeout(() => this.FinishFirstLoading(), 2000); // Finish first loading after 2 seconds
      }
    }, this.speed / 3);
  }

  FinishFirstLoading() {
    this.FirstLoadingFinished.emit();
  }
}
