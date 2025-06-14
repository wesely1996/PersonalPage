import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HackerRunGameComponent } from './hacker-run-game.component';

describe('HackerRunGameComponent', () => {
  let component: HackerRunGameComponent;
  let fixture: ComponentFixture<HackerRunGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HackerRunGameComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HackerRunGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
