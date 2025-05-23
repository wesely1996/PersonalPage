import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analog-clock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analog-clock.component.html',
  styleUrls: ['./analog-clock.component.scss'],
})
export class AnalogClockComponent implements OnInit {
  ticks = Array.from({ length: 12 }, (_, i) => i);

  ngOnInit(): void {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);
  }

  updateClock(): void {
    const now = new Date();
    const sec = -90 + now.getSeconds() * 6;
    const min = -90 + now.getMinutes() * 6 + sec / 60;
    const hr = -90 + (now.getHours() % 12) * 30 + min / 12;

    const secHand = document.querySelector('.hand.sec') as HTMLElement;
    const minHand = document.querySelector('.hand.min') as HTMLElement;
    const hrHand = document.querySelector('.hand.hr') as HTMLElement;

    if (secHand && minHand && hrHand) {
      secHand.style.transform = `rotate(${sec}deg)`;
      minHand.style.transform = `rotate(${min}deg)`;
      hrHand.style.transform = `rotate(${hr}deg)`;
    }
  }
}
