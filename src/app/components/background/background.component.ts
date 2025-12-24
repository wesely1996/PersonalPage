import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatrixBackgroundComponent } from './matrix-background/matrix-background.component';

@Component({
  selector: 'app-background',
  standalone: true,
  templateUrl: './background.component.html',
  imports: [CommonModule, MatrixBackgroundComponent],
  styleUrls: ['./background.component.scss'],
})
export class BackgroundComponent implements OnChanges {
  @Input() backgroundState: string = 'default'; // Default background
  activeBackground: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['backgroundState']) {
      this.setBackground();
    }
  }

  private setBackground() {
    switch (this.backgroundState) {
      case 'matrix':
        this.activeBackground = 'matrix';
        break;
      default:
        this.activeBackground = 'default';
    }
  }
}
