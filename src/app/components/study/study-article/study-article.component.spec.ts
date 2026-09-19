import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { StudyArticleComponent } from './study-article.component';
import {
  StudyService,
  StudyTopic,
  renderStudyMarkdown,
} from '../../../services/study/study.service';

const TOPIC: StudyTopic = {
  slug: 'sql',
  track: 'Engineering',
  title: 'SQL',
  summary: 'Queries',
  from: 'zero',
  to: 'hero',
  readingMinutes: 5,
  figures: 1,
  tags: [],
};

describe('StudyArticleComponent', () => {
  let fixture: ComponentFixture<StudyArticleComponent>;
  let component: StudyArticleComponent;
  let study: jasmine.SpyObj<StudyService>;

  beforeEach(async () => {
    study = jasmine.createSpyObj('StudyService', ['getContent']);
    study.getContent.and.returnValue(
      of(renderStudyMarkdown('## One\n\ntext [jump](#two)\n\n## Two\n\n### Sub'))
    );

    await TestBed.configureTestingModule({
      imports: [StudyArticleComponent],
      providers: [{ provide: StudyService, useValue: study }],
    }).compileComponents();

    fixture = TestBed.createComponent(StudyArticleComponent);
    component = fixture.componentInstance;
  });

  function setTopic(topic: StudyTopic) {
    fixture.componentRef.setInput('topic', topic);
    fixture.detectChanges();
  }

  it('loads the topic and renders contents and body', fakeAsync(() => {
    setTopic(TOPIC);
    tick();
    expect(study.getContent).toHaveBeenCalledWith('sql');
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.study-toc button').length).toBe(3);
    expect(el.querySelector('.study-body h2#two')).toBeTruthy();
    expect(component.sectionCount).toBe(2);
    expect(el.querySelector('.status-count')?.textContent).toContain('1/2');
  }));

  it('scrolls to a section when an in-page link is clicked', fakeAsync(() => {
    setTopic(TOPIC);
    tick();
    const target = fixture.nativeElement.querySelector('#two') as HTMLElement;
    const spy = spyOn(target, 'scrollIntoView');
    const link = fixture.nativeElement.querySelector(
      '.study-body a[href="#two"]'
    ) as HTMLAnchorElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBeTrue();
    expect(spy).toHaveBeenCalled();
  }));

  it('tracks the current section and progress while scrolling', fakeAsync(() => {
    const host: HTMLElement = fixture.nativeElement;
    host.style.display = 'block';
    host.style.height = '200px';
    study.getContent.and.returnValue(
      of(
        renderStudyMarkdown(
          ['One', 'Two', 'Three']
            .map((h) => `## ${h}\n\n${'Lorem ipsum dolor sit amet. '.repeat(80)}`)
            .join('\n\n')
        )
      )
    );
    setTopic(TOPIC);
    tick();

    const scroller = host.querySelector('.study-scroll') as HTMLElement;
    const three = host.querySelector('#three') as HTMLElement;
    scroller.scrollTop =
      three.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(component.activeId).toBe('three');
    expect(component.activeSectionTitle).toBe('Three');
    expect(component.progress).toBeGreaterThan(50);
  }));

  it('draws a textual progress bar', () => {
    component.progress = 50;
    expect(component.progressBar(10)).toBe('#####-----');
  });

  it('shows an error when the content fails to load', () => {
    study.getContent.and.returnValue(throwError(() => new Error('x')));
    setTopic(TOPIC);
    expect(fixture.nativeElement.querySelector('.study-state-error')).toBeTruthy();
  });
});
