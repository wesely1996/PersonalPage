import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerminalDialogComponent } from './terminal-dialog.component';

describe('TerminalDialogComponent', () => {
  let component: TerminalDialogComponent;
  let fixture: ComponentFixture<TerminalDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerminalDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TerminalDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
