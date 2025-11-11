import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

const CACHE_KEY = 'codexPdfPrefetch:v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CODEX_PDF_URL = environment.codexPdfUrl;

@Injectable({ providedIn: 'root' })
export class CodexCacheService {
  prefetch(): void {
    // Avoid network if we have prefetched within TTL
    const ts = this.getTimestamp();
    if (ts && Date.now() - ts < CACHE_TTL_MS) return;

    // Fire and forget fetch to warm browser cache / service worker cache
    try {
      fetch(CODEX_PDF_URL, { cache: 'force-cache', mode: 'no-cors' })
        .catch(() => {})
        .finally(() => this.setTimestamp(Date.now()));
    } catch {
      // ignore fetch errors
    }
  }

  private getTimestamp(): number | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  }

  private setTimestamp(ts: number): void {
    try {
      localStorage.setItem(CACHE_KEY, String(ts));
    } catch {
      // ignore storage errors
    }
  }
}
