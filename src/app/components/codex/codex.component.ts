import { Component, OnInit } from '@angular/core';
import { PdfViewerComponent } from '../pdf-viewer/pdf-viewer.component';

@Component({
  selector: 'app-codex',
  templateUrl: './codex.component.html',
  styleUrl: './codex.component.scss',
  imports: [PdfViewerComponent],
})
export class CodexComponent implements OnInit {
  grid: { delay: number }[] = [];
  rows = 10;
  cols = 10;
  totalDuration = 2000;

  ngOnInit(): void {
    const boxCount = this.rows * this.cols;
    for (let i = 0; i < boxCount; i++) {
      const delay = (i / boxCount) * this.totalDuration;
      this.grid.push({ delay });
    }
  }
}
