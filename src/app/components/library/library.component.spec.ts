import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { LibraryComponent } from './library.component';

describe('LibraryComponent', () => {
  let component: LibraryComponent;
  let fixture: ComponentFixture<LibraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LibraryComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(LibraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialise with no selected book', () => {
    expect(component.selectedBook).toBeNull();
  });

  it('should open and close a book', () => {
    const book = { title: 'Test', author: 'Author', genre: 'Fiction', score: 4 };
    component.openBook(book as any);
    expect(component.selectedBook).toBe(book as any);
    component.closeBook();
    expect(component.selectedBook).toBeNull();
  });

  it('stars() should return an array of five booleans with correct filled count', () => {
    const result = component.stars(3);
    expect(result.length).toBe(5);
    expect(result.filter(Boolean).length).toBe(3);
  });

  it('spineColor() should return a hex string', () => {
    const color = component.spineColor('Fiction');
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
