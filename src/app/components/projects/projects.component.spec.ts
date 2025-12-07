import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectsCacheService } from '../../services/projects-cache/projects-cache.service';

import { ProjectsComponent } from './projects.component';

describe('ProjectsComponent', () => {
  let component: ProjectsComponent;
  let fixture: ComponentFixture<ProjectsComponent>;
  const cacheStub = {
    getProjects: jasmine.createSpy('getProjects').and.returnValue(Promise.resolve([])),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsComponent],
      providers: [{ provide: ProjectsCacheService, useValue: cacheStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
