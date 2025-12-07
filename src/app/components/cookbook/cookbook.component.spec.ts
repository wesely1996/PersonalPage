import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { GoogleSheetsService } from '../../services/google-sheets/google-sheets-service.service';
import { CookbookComponent } from './cookbook.component';

describe('CookbookComponent', () => {
  let component: CookbookComponent;
  let fixture: ComponentFixture<CookbookComponent>;
  let sheets: jasmine.SpyObj<GoogleSheetsService>;
  const originalUrl = environment.cookbookCsvUrl;

  beforeEach(async () => {
    sheets = jasmine.createSpyObj('GoogleSheetsService', ['fetchBooksFromSheet']);
    await TestBed.configureTestingModule({
      imports: [CookbookComponent],
      providers: [{ provide: GoogleSheetsService, useValue: sheets }],
    }).compileComponents();

    fixture = TestBed.createComponent(CookbookComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    environment.cookbookCsvUrl = originalUrl;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should skip loading when csv url is missing', () => {
    environment.cookbookCsvUrl = '';
    fixture.detectChanges();
    expect(sheets.fetchBooksFromSheet).not.toHaveBeenCalled();
    expect(component.recipes).toEqual([]);
  });

  it('should load recipes when csv url is configured', fakeAsync(() => {
    const rows = [{ Name: 'Tomato Soup' }];
    environment.cookbookCsvUrl = 'https://example.com/cookbook.csv';
    sheets.fetchBooksFromSheet.and.returnValue(Promise.resolve(rows));

    fixture.detectChanges();
    tick();

    expect(sheets.fetchBooksFromSheet).toHaveBeenCalledWith(environment.cookbookCsvUrl);
    expect(component.recipes).toEqual(rows);
  }));
});
