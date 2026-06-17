import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MoviesComponent } from './movies.component';

describe('MoviesComponent', () => {
  let component: MoviesComponent;
  let fixture: ComponentFixture<MoviesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoviesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MoviesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose a genre color map', () => {
    expect(component.genreColors).toBeTruthy();
    expect(typeof component.genreColors).toBe('object');
  });

  it('should include expected movie genres in the color map', () => {
    expect(component.genreColors['Drama']).toBeDefined();
    expect(component.genreColors['Action']).toBeDefined();
    expect(component.genreColors['Sci-Fi']).toBeDefined();
  });
});
