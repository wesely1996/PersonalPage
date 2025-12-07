import { fakeAsync, tick } from '@angular/core/testing';

import { GoogleSheetsService } from '../google-sheets/google-sheets-service.service';
import { Project, ProjectsCacheService } from './projects-cache.service';

describe('ProjectsCacheService', () => {
  let sheetsSpy: jasmine.SpyObj<GoogleSheetsService>;
  let service: ProjectsCacheService;

  const sampleProjects: Project[] = [
    { id: 1, name: 'One', yearStarted: 2023, component: 'one' },
    { id: 2, name: 'Two', yearStarted: 2022, component: 'two' },
  ];

  beforeEach(() => {
    sheetsSpy = jasmine.createSpyObj('GoogleSheetsService', ['fetchBooksFromSheet']);
    service = new ProjectsCacheService(sheetsSpy);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns cached projects when cache is fresh', async () => {
    localStorage.setItem(
      'projectsCache:v1',
      JSON.stringify({ ts: Date.now(), data: sampleProjects })
    );

    const result = await service.getProjects();

    expect(result).toEqual(sampleProjects);
    expect(sheetsSpy.fetchBooksFromSheet).not.toHaveBeenCalled();
  });

  it('fetches, sorts, and caches projects when cache is stale', async () => {
    sheetsSpy.fetchBooksFromSheet.and.returnValue(
      Promise.resolve([
        { id: 2, name: 'Two', yearStarted: 2022, component: 'two' },
        { id: 1, name: 'One', yearStarted: 2023, component: 'one' },
      ] as Project[])
    );

    const result = await service.getProjects();

    expect(result.map((p) => p.id)).toEqual([1, 2]);
    const cached = JSON.parse(localStorage.getItem('projectsCache:v1') as string);
    expect(cached.data.map((p: Project) => p.id)).toEqual([1, 2]);
    expect(typeof cached.ts).toBe('number');
  });

  it('prefetch swallows getProjects errors', fakeAsync(() => {
    spyOn(service, 'getProjects').and.returnValue(Promise.reject('fail'));

    expect(() => service.prefetch()).not.toThrow();
    tick();
  }));
});
