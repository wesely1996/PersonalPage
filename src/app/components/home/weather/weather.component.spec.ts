import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { WeatherComponent } from './weather.component';

describe('WeatherComponent', () => {
  let component: WeatherComponent;
  let fixture: ComponentFixture<WeatherComponent>;
  let geolocationPropertySpy: jasmine.Spy;
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
    geolocationPropertySpy = spyOnProperty(
      navigator,
      'geolocation',
      'get'
    ).and.returnValue(geolocationMock as Geolocation);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    spyOn(component, 'fetchWeather').and.stub();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should use cached location when available', () => {
    localStorage.setItem('app-weather-location', '1,2');
    const fetchSpy = spyOn(component, 'fetchWeather').and.stub();
    const geolocationSpy = spyOn(geolocationMock, 'getCurrentPosition');
    fixture.detectChanges();
    expect(component.location).toBe('1,2');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(geolocationSpy).not.toHaveBeenCalled();
  });

  it('should cache geolocation result before fetching', () => {
    const fetchSpy = spyOn(component, 'fetchWeather').and.stub();
    spyOn(geolocationMock, 'getCurrentPosition').and.callThrough();
    fixture.detectChanges();
    expect(component.location).toBe('0,0');
    expect(localStorage.getItem('app-weather-location')).toBe('0,0');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should fall back to default location when geolocation is unavailable', () => {
    geolocationPropertySpy.and.returnValue(undefined as unknown as Geolocation);
    fixture = TestBed.createComponent(WeatherComponent);
    component = fixture.componentInstance;
    spyOn(component, 'fetchWeather').and.stub();
    fixture.detectChanges();
    expect(component.location).toBe('Belgrade');
  });
});
