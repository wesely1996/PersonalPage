import {
  Component,
  Input,
  Output,
  ElementRef,
  ViewChild,
  AfterViewInit,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebBrowserComponent } from '../web-browser/web-browser.component';
import { ArticleComponent } from '../article/article.component';

@Component({
  selector: 'app-terminal-dialog',
  standalone: true,
  imports: [CommonModule, WebBrowserComponent, ArticleComponent],
  templateUrl: './terminal-dialog.component.html',
  styleUrls: ['./terminal-dialog.component.scss'],
})
export class TerminalDialogComponent implements AfterViewInit {
  @Input() title: string = 'Terminal';
  @Input() width: string = '100%';
  @Input() height: string = 'auto';
  @Input() component: string | null = null;
  @Input() componentData: any | null = null;

  @Output() closeDialogEvent = new EventEmitter<void>();

  @ViewChild('dialog') dialog!: ElementRef;

  isDragging = false;
  offsetX = 0;
  offsetY = 0;

  ngAfterViewInit() {
    const dialog = this.dialog.nativeElement;

    dialog.addEventListener('mousedown', (event: MouseEvent) => {
      if ((event.target as HTMLElement).classList.contains('terminal-header')) {
        this.isDragging = true;
        this.offsetX = event.clientX - dialog.offsetLeft;
        this.offsetY = event.clientY - dialog.offsetTop;
      }
    });

    document.addEventListener('mousemove', (event: MouseEvent) => {
      if (this.isDragging) {
        dialog.style.left = `${event.clientX - this.offsetX}px`;
        dialog.style.top = `${event.clientY - this.offsetY}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
  }

  close() {
    this.closeDialogEvent.emit();
  }
}
