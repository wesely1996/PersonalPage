import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArchiveSelectionButtonComponent } from './archive-selection-button.component';

describe('ArchiveSelectionButtonComponent', () => {
  let component: ArchiveSelectionButtonComponent;
  let fixture: ComponentFixture<ArchiveSelectionButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArchiveSelectionButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ArchiveSelectionButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render provided label', () => {
    const label = 'Archive Item';
    component.label = label;
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('.text').textContent;
    expect(text).toContain(label);
  });
});
