import { Injectable } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScreenSizeService {
  private isMobileSubject = new BehaviorSubject<boolean>(false);
  public isMobile$: Observable<boolean> = this.isMobileSubject.asObservable();

  /**
   * This service checks if the screen is narrow enough to be considered a mobile device
   */
  constructor(private breakpointObserver: BreakpointObserver) {
    // Observe the Breakpoints.Handset media query, and emit a boolean value
    // indicating if the screen is narrow enough to be considered a mobile device
    this.breakpointObserver
      .observe([Breakpoints.Handset])
      .subscribe((result) => {
        this.isMobileSubject.next(result.matches);
      });
  }

  // Get current value without subscribing
  isMobile(): boolean {
    return this.isMobileSubject.value;
  }
}
