import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { WeatherComponent } from './weather.component';

describe('WeatherComponent', () => {
  let component: WeatherComponent;
  let fixture: ComponentFixture<WeatherComponent>;
  const geolocationMock = {
    getCurrentPosition: (cb: PositionCallback) =>
      cb({
        coords: { latitude: 0, longitude: 0 } as GeolocationCoordinates,
        timestamp: Date.now(),
      } as GeolocationPosition),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, WeatherComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherComponent);
    component = fixture.componentInstance;
    // Prevent real geolocation or HTTP calls during tests
    spyOn(component, 'fetchWeather').and.stub();
    spyOnProperty(navigator, 'geolocation', 'get').and.returnValue(
      geolocationMock as Geolocation
    );
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
