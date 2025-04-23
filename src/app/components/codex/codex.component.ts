import { Component } from '@angular/core';
import { PdfViewerComponent } from '../pdf-viewer/pdf-viewer.component';

@Component({
  selector: 'app-codex',
  templateUrl: './codex.component.html',
  styleUrl: './codex.component.scss',
  imports: [PdfViewerComponent],
})
export class CodexComponent {}
