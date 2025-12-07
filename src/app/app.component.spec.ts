import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { CodexCacheService } from './services/codex-cache/codex-cache.service';
import { ProjectsCacheService } from './services/projects-cache/projects-cache.service';

describe('AppComponent', () => {
  const projectsCacheStub = { prefetch: jasmine.createSpy('prefetch') };
  const codexCacheStub = { prefetch: jasmine.createSpy('prefetch') };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, AppComponent],
      providers: [
        { provide: ProjectsCacheService, useValue: projectsCacheStub },
        { provide: CodexCacheService, useValue: codexCacheStub },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'personal-page' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('personal-page');
  });

  it('should start with matrix background state', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.backgroundState).toBe('matrix');
  });
});
