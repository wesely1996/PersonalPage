import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Papa from 'papaparse';

@Injectable({ providedIn: 'root' })
export class GoogleSheetsService {
  constructor(private http: HttpClient) {}

  fetchBooksFromSheet(sheetUrl: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.http.get(sheetUrl, { responseType: 'text' }).subscribe({
        next: (csvData) => {
          Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => resolve(result.data),
            error: (err: any) => reject(err),
          });
        },
        error: (err) => reject(err),
      });
    });
  }
}
