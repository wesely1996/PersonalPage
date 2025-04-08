import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectsButtonComponent } from './projects-button.component';

describe('ProjectsButtonComponent', () => {
  let component: ProjectsButtonComponent;
  let fixture: ComponentFixture<ProjectsButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectsButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectsButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
