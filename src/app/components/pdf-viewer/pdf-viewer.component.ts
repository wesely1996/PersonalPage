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
  @Input() wrapperWidth: string = '100vw';
  @Input() wrapperHeight: string = '90vh';
  @Input() pdfWidth: string = '80%';
  @Input() pdfHeight: string = '100%';
  zoom = 1;

  download() {
    const link = document.createElement('a');
    link.href = this.pdfUrl;
    link.download = this.getFileName(this.pdfUrl);
    link.click();
  }

  private getFileName(url: string): string {
    return url.split('/').pop() || 'download.pdf';
  }
}
