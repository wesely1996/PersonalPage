import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { GoogleSheetsService } from './google-sheets-service.service';

describe('GoogleSheetsService', () => {
  let service: GoogleSheetsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(GoogleSheetsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
