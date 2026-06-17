import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TvShowsComponent } from './tv-shows.component';

describe('TvShowsComponent', () => {
  let component: TvShowsComponent;
  let fixture: ComponentFixture<TvShowsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TvShowsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TvShowsComponent);
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

  it('should include expected TV genres in the color map', () => {
    expect(component.genreColors['Drama']).toBeDefined();
    expect(component.genreColors['Crime']).toBeDefined();
    expect(component.genreColors['Sci-Fi']).toBeDefined();
  });
});
