import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-web-browser',
  imports: [],
  templateUrl: './web-browser.component.html',
  styleUrl: './web-browser.component.scss',
})
export class WebBrowserComponent {
  @Input()
  address: string = 'https://github.com/wesely1996';

  safeUrl: SafeResourceUrl = '';

  constructor(private sanitizer: DomSanitizer) {}

  loadUrl(url: string) {
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  ngOnInit() {
    this.loadUrl(this.address);
  }
}
