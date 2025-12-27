import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { GoogleSheetsService } from '../../services/google-sheets/google-sheets-service.service';
import { CookbookComponent } from './cookbook.component';

describe('CookbookComponent', () => {
  let component: CookbookComponent;
  let fixture: ComponentFixture<CookbookComponent>;
  let sheets: jasmine.SpyObj<GoogleSheetsService>;
  const originalUrl = environment.cookbookCsvUrl;

  beforeEach(async () => {
    sheets = jasmine.createSpyObj('GoogleSheetsService', [
      'fetchBooksFromSheet',
    ]);
    sheets.fetchBooksFromSheet.and.returnValue(Promise.resolve([]));
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
    expect(component.filtered).toEqual([]);
  });

  it('should load recipes when csv url is configured', fakeAsync(() => {
    const rows = [
      { title: 'Tomato Soup', rating: '3', categories: 'Soup, Dinner' },
    ];
    environment.cookbookCsvUrl = 'https://example.com/cookbook.csv';
    sheets.fetchBooksFromSheet.and.returnValue(Promise.resolve(rows));

    fixture.detectChanges();
    tick();

    expect(sheets.fetchBooksFromSheet).toHaveBeenCalledWith(
      environment.cookbookCsvUrl
    );
    expect(component.recipes.length).toBe(1);
    expect(component.recipes[0].title).toBe('Tomato Soup');
    expect(component.recipes[0].rating).toBe(3);
    expect(component.recipes[0].categories).toEqual(['Soup', 'Dinner']);
    expect(component.filtered.length).toBe(1);
  }));

  it('should filter recipes by query', () => {
    component.recipes = [
      {
        title: 'Apple Pie',
        instructions: 'Bake',
        ingredients: '',
        categories: ['Dessert'],
        rating: 5,
      },
      {
        title: 'Tomato Soup',
        instructions: 'Simmer',
        ingredients: '',
        categories: ['Soup', 'Dinner'],
        rating: 4,
      },
    ];
    component.applyFilter();
    expect(component.filtered.length).toBe(2);

    component.query = 'pie';
    component.applyFilter();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].title).toBe('Apple Pie');

    component.query = 'dinner';
    component.applyFilter();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].title).toBe('Tomato Soup');
  });
});
