import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { HackerRunHighscoreService } from './hacker-run-highscore.service';

const API_URL =
  'https://script.google.com/macros/s/AKfycbwytEpVjThOS6xtD9xBeorPwG-RgOk6xiRfUHWBwRnU-LRiH5WbErtBCZqZqvn36B6gnQ/exec';

describe('HackerRunHighscoreService', () => {
  let service: HackerRunHighscoreService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [HackerRunHighscoreService],
    });

    service = TestBed.inject(HackerRunHighscoreService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches and maps the high score response', (done) => {
    service.fetchHighscore().then((result) => {
      expect(result).toEqual({ name: 'Alice', highscore: 99 });
      done();
    });

    const req = httpMock.expectOne(
      (request) =>
        request.url.startsWith(API_URL) &&
        request.urlWithParams.includes('action=getHighscore')
    );

    expect(req.request.method).toBe('JSONP');

    req.flush({
      ok: true,
      action: 'getHighscore',
      best: { name: 'Alice', highscore: 99 },
    });
  });

  it('submits the score and uses the payload as fallback when best is missing', (done) => {
    const payload = { name: 'Bob', score: 10 };

    service.submitScore(payload).then((result) => {
      expect(result.newHighscore).toBeTrue();
      expect(result.best).toEqual({ name: 'Bob', highscore: 10 });
      done();
    });

    const req = httpMock.expectOne(
      (request) =>
        request.url.startsWith(API_URL) &&
        request.urlWithParams.includes('action=submitScore') &&
        request.urlWithParams.includes('name=Bob') &&
        request.urlWithParams.includes('score=10')
    );

    expect(req.request.method).toBe('JSONP');

    req.flush({
      ok: true,
      action: 'submitScore',
      newHighscore: true,
      best: null,
    });
  });
});

