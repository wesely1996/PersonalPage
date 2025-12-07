import { CodexCacheService } from './codex-cache.service';
import { environment } from '../../../environments/environment';
import { fakeAsync, flushMicrotasks } from '@angular/core/testing';

describe('CodexCacheService', () => {
  let service: CodexCacheService;
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    localStorage.clear();
    fetchSpy = spyOn(window as any, 'fetch').and.returnValue(
      Promise.resolve({} as Response)
    );
    service = new CodexCacheService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('skips prefetch when cache is still fresh', () => {
    localStorage.setItem('codexPdfPrefetch:v1', String(Date.now()));

    service.prefetch();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches and stores timestamp when cache is cold', fakeAsync(() => {
    fetchSpy.and.returnValue(Promise.resolve({} as Response));

    service.prefetch();
    flushMicrotasks();

    expect(fetchSpy).toHaveBeenCalledWith(
      environment.codexPdfUrl,
      jasmine.objectContaining({ cache: 'force-cache', mode: 'no-cors' })
    );
    expect(localStorage.getItem('codexPdfPrefetch:v1')).toBeTruthy();
  }));

  it('stores timestamp even if fetch rejects', fakeAsync(() => {
    fetchSpy.and.returnValue(Promise.reject('network error'));

    service.prefetch();
    flushMicrotasks();

    expect(localStorage.getItem('codexPdfPrefetch:v1')).toBeTruthy();
  }));
});
