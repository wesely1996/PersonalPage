import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectSelectionButtonComponent } from './project-selection-button.component';

describe('ProjectSelectionButtonComponent', () => {
  let component: ProjectSelectionButtonComponent;
  let fixture: ComponentFixture<ProjectSelectionButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectSelectionButtonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectSelectionButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
