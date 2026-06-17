import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { GamesComponent } from './games.component';

describe('GamesComponent', () => {
  let component: GamesComponent;
  let fixture: ComponentFixture<GamesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GamesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(GamesComponent);
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

  it('should include expected game genres in the color map', () => {
    expect(component.genreColors['RPG']).toBeDefined();
    expect(component.genreColors['FPS']).toBeDefined();
    expect(component.genreColors['Action-Adventure']).toBeDefined();
  });
});
