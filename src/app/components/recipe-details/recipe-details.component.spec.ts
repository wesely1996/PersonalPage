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

  it('should return empty entries when data is missing', () => {
    component.data = null as any;
    expect(component.otherEntries).toEqual([]);
  });

  it('should expose non-core fields via otherEntries', () => {
    component.data = {
      Name: 'Cake',
      Description: 'Tasty',
      Ingredients: 'Flour',
      Steps: 'Mix',
      PrepTime: '30m',
      Servings: 4,
    };
    fixture.detectChanges();
    const entries = component.otherEntries;
    expect(entries).toEqual(jasmine.arrayContaining([
      { key: 'PrepTime', value: '30m' },
      { key: 'Servings', value: 4 },
    ]));
    expect(entries.find((e) => e.key === 'Name')).toBeUndefined();
  });
});
