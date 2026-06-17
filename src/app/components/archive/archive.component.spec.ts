import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { ArchiveComponent } from './archive.component';

describe('ArchiveComponent', () => {
  let component: ArchiveComponent;
  let fixture: ComponentFixture<ArchiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, ArchiveComponent],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArchiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render six navigation links', () => {
    const links: NodeListOf<HTMLAnchorElement> = fixture.nativeElement.querySelectorAll('a');
    expect(links.length).toBe(6);
  });

  it('should include links for all archive sections', () => {
    const hrefs: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>
    ).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs).toContain('/archive/cookbook');
    expect(hrefs).toContain('/archive/blog');
    expect(hrefs).toContain('/archive/movies');
    expect(hrefs).toContain('/archive/library');
    expect(hrefs).toContain('/archive/games');
    expect(hrefs).toContain('/archive/tv-shows');
  });

  it('should render the container with a single scrollable row', () => {
    const container: HTMLElement = fixture.nativeElement.querySelector('.archive-component-container');
    const styles = getComputedStyle(container);
    expect(styles.flexWrap).toBe('nowrap');
    expect(styles.overflowX).toBe('auto');
  });
});
