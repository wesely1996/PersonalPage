import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { StudyComponent, groupByTrack } from './study.component';
import { StudyService, StudyTopic } from '../../services/study/study.service';

const TOPICS: StudyTopic[] = [
  {
    slug: 'one',
    track: 'Engineering',
    title: 'Topic one',
    summary: 'First',
    from: 'zero',
    to: 'hero',
    readingMinutes: 10,
    figures: 2,
    tags: ['a'],
  },
  {
    slug: 'two',
    track: 'Engineering',
    title: 'Topic two',
    summary: 'Second',
    from: 'junior',
    to: 'architect',
    readingMinutes: 20,
    figures: 3,
    tags: ['b'],
  },
];

describe('StudyComponent', () => {
  let fixture: ComponentFixture<StudyComponent>;
  let component: StudyComponent;
  let study: jasmine.SpyObj<StudyService>;

  beforeEach(async () => {
    study = jasmine.createSpyObj('StudyService', ['getTopics', 'getContent']);
    study.getTopics.and.returnValue(of(TOPICS));
    study.getContent.and.returnValue(of({ html: '', toc: [] }));

    await TestBed.configureTestingModule({
      imports: [StudyComponent],
      providers: [{ provide: StudyService, useValue: study }],
    }).compileComponents();

    fixture = TestBed.createComponent(StudyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('lists every module in order', () => {
    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('.module-title')
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(titles).toEqual(['Topic one', 'Topic two']);
    expect(fixture.nativeElement.querySelector('.module-order').textContent).toBe('01');
  });

  it('opens a module in the terminal dialog and closes it', () => {
    fixture.nativeElement.querySelectorAll('.module')[1].click();
    fixture.detectChanges();
    expect(component.selected?.slug).toBe('two');
    expect(fixture.nativeElement.querySelector('app-terminal-dialog')).toBeTruthy();

    component.close();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-terminal-dialog')).toBeNull();
  });

  it('moves focus between modules with the arrow keys', () => {
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.module')
    );
    buttons[0].focus();
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(document.activeElement).toBe(buttons[1]);
    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('groups modules by track, keeping each track together', () => {
    const lang = { ...TOPICS[0], slug: 'ru', track: 'Languages' };
    const tracks = groupByTrack([TOPICS[0], lang, TOPICS[1]]);
    expect(tracks.map((t) => [t.name, t.offset, t.topics.length])).toEqual([
      ['Engineering', 0, 2],
      ['Languages', 2, 1],
    ]);
  });

  it('shows an error when the manifest fails to load', async () => {
    study.getTopics.and.returnValue(throwError(() => new Error('x')));
    const errored = TestBed.createComponent(StudyComponent);
    errored.detectChanges();
    expect(errored.nativeElement.querySelector('.state-error')).toBeTruthy();
  });
});
