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

  it('should select the matching project by id', () => {
    component.projects = [
      { id: 1, name: 'One', yearStarted: 2022, component: 'c-one' },
      { id: 2, name: 'Two', yearStarted: 2023, component: 'c-two' },
    ];

    component.openProject(2);

    expect(component.selectedProject?.id).toBe(2);
  });

  it('should clear selection when closing dialog', () => {
    component.selectedProject = {
      id: 3,
      name: 'Three',
      yearStarted: 2021,
      component: 'c-three',
    };

    component.closeDialog();

    expect(component.selectedProject).toBeNull();
  });
});
