import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GoogleSheetsService } from '../../services/google-sheets/google-sheets-service.service';
import { DataTableComponent } from './data-table.component';

describe('DataTableComponent', () => {
  let component: DataTableComponent;
  let fixture: ComponentFixture<DataTableComponent>;
  let sheets: jasmine.SpyObj<GoogleSheetsService>;

  beforeEach(async () => {
    sheets = jasmine.createSpyObj('GoogleSheetsService', ['fetchBooksFromSheet']);
    sheets.fetchBooksFromSheet.and.returnValue(Promise.resolve([]));
    await TestBed.configureTestingModule({
      imports: [DataTableComponent],
      providers: [{ provide: GoogleSheetsService, useValue: sheets }],
    }).compileComponents();

    fixture = TestBed.createComponent(DataTableComponent);
    component = fixture.componentInstance;
    component.csvUrl = 'https://example.com/data.csv';
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load rows and build ordered columns', fakeAsync(() => {
    const rows = [
      { Name: 'Alpha', Genre: 'Action', Rating: '5', Extra: 'X' },
      { Name: 'Beta', Genre: 'Drama', Rating: '4', Extra: 'Y' },
    ];
    sheets.fetchBooksFromSheet.and.returnValue(Promise.resolve(rows));

    fixture.detectChanges();
    tick();

    expect(sheets.fetchBooksFromSheet).toHaveBeenCalledWith(component.csvUrl);
    expect(component.rows.length).toBe(2);
    expect(component.columns).toEqual(['Name', 'Genre', 'Rating', 'Extra']);
  }));

  it('should filter and sort rows', fakeAsync(() => {
    const rows = [
      { Name: 'Charlie', Genre: 'Sci-Fi', Rating: '5' },
      { Name: 'Bravo', Genre: 'Comedy', Rating: '4' },
    ];
    sheets.fetchBooksFromSheet.and.returnValue(Promise.resolve(rows));

    fixture.detectChanges();
    tick();

    component.query = 'br';
    component.applyFilter();

    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0]['Name']).toBe('Bravo');

    component.sortBy('Name');
    expect(component.sortKey).toBe('Name');
    component.sortBy('Name');
    expect(component.sortDir).toBe('desc');
  }));
});
