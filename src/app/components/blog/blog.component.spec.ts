import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';
import { GoogleSheetsService } from '../../services/google-sheets/google-sheets-service.service';
import { BlogComponent } from './blog.component';

describe('BlogComponent', () => {
  let component: BlogComponent;
  let fixture: ComponentFixture<BlogComponent>;
  let sheets: jasmine.SpyObj<GoogleSheetsService>;
  let sanitizer: { bypassSecurityTrustHtml: jasmine.Spy };
  let markedSpy: jasmine.Spy;

  beforeEach(async () => {
    sheets = jasmine.createSpyObj('GoogleSheetsService', ['fetchBooksFromSheet']);
    sanitizer = {
      bypassSecurityTrustHtml: jasmine
        .createSpy('bypassSecurityTrustHtml')
        .and.callFake((html: string) => `safe:${html}` as any),
    } as any;
    markedSpy = spyOn(marked, 'parse');

    await TestBed.configureTestingModule({
      imports: [BlogComponent],
      providers: [
        { provide: GoogleSheetsService, useValue: sheets },
        { provide: DomSanitizer, useValue: sanitizer },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogComponent);
    component = fixture.componentInstance;
  });

  it('should create and load posts', fakeAsync(() => {
    const rows = [
      { id: '2', title: 'Second', date: '02.01.2024', content: 'Second post' },
      { id: '1', title: 'First', date: '01.01.2024', content: 'First post' },
    ];
    sheets.fetchBooksFromSheet.and.returnValue(Promise.resolve(rows));
    markedSpy.and.returnValue(Promise.resolve('<p>html</p>') as any);

    fixture.detectChanges();
    tick();

    expect(sheets.fetchBooksFromSheet).toHaveBeenCalled();
    expect(markedSpy).toHaveBeenCalledWith('Second post');
    expect(component.posts.length).toBe(2);
    expect(component.posts[0].title).toBe('Second');
    expect(component.posts[0].displayDate).toBe('02.01.2024');
    expect(component.error).toBeNull();
    expect(component.loading).toBeFalse();
    expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalled();
  }));

  it('should handle load failures gracefully', fakeAsync(() => {
    sheets.fetchBooksFromSheet.and.returnValue(Promise.reject('fail'));
    markedSpy.and.returnValue(Promise.resolve('<p>html</p>') as any);

    fixture.detectChanges();
    tick();

    expect(component.posts).toEqual([]);
    expect(component.error).toContain('Failed');
    expect(component.loading).toBeFalse();
  }));
});
