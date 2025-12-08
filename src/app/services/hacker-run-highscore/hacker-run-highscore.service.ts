import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface HighscoreResponse {
  readonly name: string;
  readonly highscore: number;
}

export interface SubmitScorePayload {
  readonly name: string;
  readonly score: number;
}

export interface SubmitScoreResponse {
  readonly newHighscore: boolean;
  readonly best: HighscoreResponse;
}

type BestResponse = {
  readonly name: string | null;
  readonly highscore: number | null;
};

interface AppsScriptBaseResponse {
  readonly ok: boolean;
  readonly error?: string;
}

interface AppsScriptHighscoreResponse extends AppsScriptBaseResponse {
  readonly action: 'getHighscore';
  readonly best: BestResponse | null;
}

interface AppsScriptSubmitScoreResponse extends AppsScriptBaseResponse {
  readonly action: 'submitScore';
  readonly newHighscore: boolean;
  readonly best: BestResponse | null;
}

const HIGHSCORE_API_URL =
  'https://script.google.com/macros/s/AKfycbwytEpVjThOS6xtD9xBeorPwG-RgOk6xiRfUHWBwRnU-LRiH5WbErtBCZqZqvn36B6gnQ/exec';

@Injectable({ providedIn: 'root' })
export class HackerRunHighscoreService {
  constructor(private readonly http: HttpClient) {}

  fetchHighscore(): Promise<HighscoreResponse> {
    const url = this.buildUrlWithParams({ action: 'getHighscore' });

    return firstValueFrom(
      this.http.jsonp<AppsScriptHighscoreResponse>(url, 'callback')
    ).then((response) => this.toHighscoreResponse(response));
  }

  submitScore(payload: SubmitScorePayload): Promise<SubmitScoreResponse> {
    return firstValueFrom(
      this.http.jsonp<AppsScriptSubmitScoreResponse>(
        this.buildUrlWithParams({
          action: 'submitScore',
          name: payload.name,
          score: payload.score,
        }),
        'callback'
      )
    ).then((response) => ({
      newHighscore: response.newHighscore,
      best: this.toHighscoreResponse(response, payload),
    }));
  }

  private buildUrlWithParams(params: Record<string, string | number>) {
    const httpParams = new HttpParams({ fromObject: params });
    return `${HIGHSCORE_API_URL}?${httpParams.toString()}`;
  }

  private toHighscoreResponse(
    response: AppsScriptHighscoreResponse | AppsScriptSubmitScoreResponse,
    fallback?: SubmitScorePayload
  ): HighscoreResponse {
    if (!response.ok) {
      throw new Error(response.error || 'Highscore service error');
    }

    const best = response.best;

    return {
      name: (best?.name ?? fallback?.name ?? '---').toString(),
      highscore: Number(best?.highscore ?? fallback?.score ?? 0),
    };
  }
}
