import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatrixBackgroundComponent } from './matrix-background.component';

describe('MatrixBackgroundComponent', () => {
  let component: MatrixBackgroundComponent;
  let fixture: ComponentFixture<MatrixBackgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatrixBackgroundComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MatrixBackgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
