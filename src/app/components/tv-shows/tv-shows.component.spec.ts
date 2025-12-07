import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TvShowsComponent } from './tv-shows.component';

describe('TvShowsComponent', () => {
  let component: TvShowsComponent;
  let fixture: ComponentFixture<TvShowsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TvShowsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TvShowsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose csv url from environment', () => {
    expect(component.csv).toBe(environment.tvShowsCsvUrl);
  });
});
