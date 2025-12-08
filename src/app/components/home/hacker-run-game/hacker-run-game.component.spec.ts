import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';

import { HackerRunGameComponent } from './hacker-run-game.component';
import { HackerRunHighscoreService } from '../../../services/hacker-run-highscore/hacker-run-highscore.service';

class HackerRunHighscoreServiceStub {
  fetchHighscore = jasmine
    .createSpy('fetchHighscore')
    .and.returnValue(Promise.resolve({ name: 'Tester', highscore: 42 }));

  submitScore = jasmine
    .createSpy('submitScore')
    .and.returnValue(
      Promise.resolve({
        newHighscore: true,
        best: {
          name: 'Tester',
          highscore: 43,
        },
      })
    );
}

describe('HackerRunGameComponent', () => {
  let component: HackerRunGameComponent;
  let fixture: ComponentFixture<HackerRunGameComponent>;
  let highscoreService: HackerRunHighscoreService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HackerRunGameComponent],
      providers: [
        { provide: HackerRunHighscoreService, useClass: HackerRunHighscoreServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HackerRunGameComponent);
    component = fixture.componentInstance;
    highscoreService = TestBed.inject(HackerRunHighscoreService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads the high score from the API and stores it locally', fakeAsync(() => {
    component['loadHighScoreFromApi']();

    expect(component.isLoadingHighScore).toBeTrue();

    flushMicrotasks();

    expect(highscoreService.fetchHighscore).toHaveBeenCalled();
    expect(component.highScore).toBe(42);
    expect(component.highScoreName).toBe('Tester');
    expect(localStorage.getItem('dinoHighScore')).toBe('42');
    expect(localStorage.getItem('dinoHighScoreName')).toBe('Tester');
    expect(component.isLoadingHighScore).toBeFalse();
  }));

  it('falls back to local storage when the API call fails', fakeAsync(() => {
    localStorage.setItem('dinoHighScore', '55');
    localStorage.setItem('dinoHighScoreName', 'LocalHero');
    (highscoreService.fetchHighscore as jasmine.Spy).and.returnValue(
      Promise.reject('network error')
    );

    component['loadHighScoreFromApi']();
    flushMicrotasks();

    expect(component.highScore).toBe(55);
    expect(component.highScoreName).toBe('LocalHero');
    expect(component.isLoadingHighScore).toBeFalse();
  }));

  it('submits a new high score when the player beats the record', fakeAsync(() => {
    const promptSpy = spyOn(window, 'prompt').and.returnValue('Ace');
    component.gameRunning = true;
    component.highScore = 10;
    component.score = 30;

    component.stopGame();
    flushMicrotasks();

    expect(promptSpy).toHaveBeenCalled();
    expect(highscoreService.submitScore).toHaveBeenCalledWith({
      name: 'Ace',
      score: 30,
    });
    expect(component.highScore).toBe(43);
    expect(component.highScoreName).toBe('Tester');
    expect(localStorage.getItem('dinoHighScore')).toBe('43');
    expect(localStorage.getItem('dinoHighScoreName')).toBe('Tester');
  }));

  it('does not submit when the game is not running', fakeAsync(() => {
    const promptSpy = spyOn(window, 'prompt');
    component.score = 50;
    component.gameRunning = false;

    component.stopGame();
    flushMicrotasks();

    expect(promptSpy).not.toHaveBeenCalled();
    expect(highscoreService.submitScore).not.toHaveBeenCalled();
  }));
});
