import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecipeDetailsComponent } from './recipe-details.component';

describe('RecipeDetailsComponent', () => {
  let component: RecipeDetailsComponent;
  let fixture: ComponentFixture<RecipeDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should parse ingredients into name and quantity pairs', () => {
    component.data = { ingredients: 'eggs:2, milk:1 cup, sugar' };
    expect(component.ingredients).toEqual([
      { name: 'eggs', quantity: '2' },
      { name: 'milk', quantity: '1 cup' },
      { name: 'sugar', quantity: '' },
    ]);
  });

  it('should extract steps from newline separated text', () => {
    component.data = { instructions: 'Step one\n\nStep two' };
    expect(component.steps).toEqual(['Step one', 'Step two']);
  });

  it('should clamp rating between 0 and 5', () => {
    component.data = { rating: 8 };
    expect(component.rating).toBe(5);
  });

  it('should split categories by comma', () => {
    component.data = { categories: 'Dinner, Comfort Food' };
    expect(component.categories).toEqual(['Dinner', 'Comfort Food']);
  });
});
