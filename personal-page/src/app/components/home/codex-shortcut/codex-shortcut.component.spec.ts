import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodexShortcutComponent } from './codex-shortcut.component';

describe('CodexShortcutComponent', () => {
  let component: CodexShortcutComponent;
  let fixture: ComponentFixture<CodexShortcutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodexShortcutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodexShortcutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
