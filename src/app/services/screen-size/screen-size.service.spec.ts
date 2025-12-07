import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { ScreenSizeService } from './screen-size.service';

class BreakpointObserverStub {
  private subject = new Subject<BreakpointState>();

  observe() {
    return this.subject.asObservable();
  }

  emit(matches: boolean) {
    this.subject.next({
      matches,
      breakpoints: {},
    });
  }
}

describe('ScreenSizeService', () => {
  let service: ScreenSizeService;
  let observer: BreakpointObserverStub;

  beforeEach(() => {
    observer = new BreakpointObserverStub();

    TestBed.configureTestingModule({
      providers: [{ provide: BreakpointObserver, useValue: observer }],
    });
    service = TestBed.inject(ScreenSizeService);
  });

  it('exposes initial desktop state', () => {
    expect(service.isMobile()).toBeFalse();
  });

  it('updates state when breakpoints change', () => {
    const values: boolean[] = [];
    service.isMobile$.subscribe((value) => values.push(value));

    observer.emit(true);
    observer.emit(false);

    expect(values).toContain(true);
    expect(service.isMobile()).toBeFalse();
  });
});
