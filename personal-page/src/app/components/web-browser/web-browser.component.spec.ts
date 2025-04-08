import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebBrowserComponent } from './web-browser.component';

describe('WebBrowserComponent', () => {
  let component: WebBrowserComponent;
  let fixture: ComponentFixture<WebBrowserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WebBrowserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WebBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
