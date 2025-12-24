import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { addHours } from 'date-fns';

@Component({
  selector: 'app-weather',
  standalone: true,
  templateUrl: './weather.component.html',
  imports: [CommonModule],
  styleUrls: ['./weather.component.scss'],
})
export class WeatherComponent implements OnInit {
  weatherData: any;
  apiKey: string = '536a50aa17e8463dbe0165247252903';
  location: string = 'Belgrade'; // Change to user's location if needed
  private readonly locationStorageKey = 'app-weather-location';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    const cachedLocation = this.getCachedLocation();

    if (cachedLocation) {
      this.location = cachedLocation;
      this.fetchWeather();
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.location = position
            ? `${position.coords.latitude},${position.coords.longitude}`
            : this.location;
          this.cacheLocation(this.location);
          this.fetchWeather();
        },
        () => this.fetchWeather()
      );
    } else {
      this.fetchWeather();
    }
  }

  fetchWeather() {
    const url = `https://api.weatherapi.com/v1/current.json?key=${this.apiKey}&q=${this.location}&aqi=yes`;

    if (
      this.weatherData == null ||
      this.weatherData.location.name !== this.location ||
      new Date(this.weatherData.current.last_updated) < addHours(new Date(), 1)
    ) {
      this.http.get(url).subscribe((data) => {
        this.weatherData = data;
      });
    }
  }

  private getCachedLocation(): string | null {
    try {
      return localStorage.getItem(this.locationStorageKey);
    } catch {
      return null;
    }
  }

  private cacheLocation(location: string): void {
    try {
      localStorage.setItem(this.locationStorageKey, location);
    } catch {
      // If storage is unavailable, we still fetch using the current location.
      return;
    }
  }
}
