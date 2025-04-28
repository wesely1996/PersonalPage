import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkipPreloadComponent } from './skip-preload.component';

describe('SkipPreloadComponent', () => {
  let component: SkipPreloadComponent;
  let fixture: ComponentFixture<SkipPreloadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkipPreloadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SkipPreloadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
