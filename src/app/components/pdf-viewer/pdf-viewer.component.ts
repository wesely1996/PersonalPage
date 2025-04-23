import { Component, Input } from '@angular/core';
import { PdfViewerModule } from 'ng2-pdf-viewer';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss'],
  standalone: true,
  imports: [PdfViewerModule],
})
export class PdfViewerComponent {
  @Input() pdfUrl: string = '';
  zoom = 1;
}
