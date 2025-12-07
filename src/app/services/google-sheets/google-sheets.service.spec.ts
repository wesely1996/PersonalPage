import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import Papa from 'papaparse';

import { GoogleSheetsService } from './google-sheets-service.service';

describe('GoogleSheetsService', () => {
  let service: GoogleSheetsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(GoogleSheetsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('parses CSV data and resolves parsed rows', (done) => {
    const sheetUrl = 'https://example.com/sheet.csv';
    const parsedRows = [{ title: 'Book 1' }, { title: 'Book 2' }];
    spyOn(Papa as any, 'parse').and.callFake(
      (input: string, config: any): any => {
        config.complete?.({ data: parsedRows } as Papa.ParseResult<unknown>, 'file');
        return {} as Papa.ParseResult<unknown>;
      }
    );

    service.fetchBooksFromSheet(sheetUrl).then((result) => {
      expect(result).toEqual(parsedRows);
      done();
    });

    const req = httpMock.expectOne(sheetUrl);
    expect(req.request.responseType).toBe('text');
    req.flush('title\nBook 1\nBook 2');
  });

  it('rejects when CSV parsing fails', (done) => {
    const sheetUrl = 'https://example.com/sheet.csv';
    const parseError = new Error('parse failed');
    spyOn(Papa as any, 'parse').and.callFake(
      (input: string, config: any): any => {
        config.error?.(parseError, 'file');
        return {} as Papa.ParseResult<unknown>;
      }
    );

    service.fetchBooksFromSheet(sheetUrl).catch((err) => {
      expect(err).toBe(parseError);
      done();
    });

    const req = httpMock.expectOne(sheetUrl);
    req.flush('invalid');
  });
});
