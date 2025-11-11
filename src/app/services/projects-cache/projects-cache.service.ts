import { Injectable } from '@angular/core';
import { GoogleSheetsService } from '../google-sheets/google-sheets-service.service';
import { environment } from '../../../environments/environment';

export interface Project {
  id: number;
  name: string;
  yearStarted: number;
  yearFinished?: number;
  component: string;
  link?: string;
}

const CACHE_KEY = 'projectsCache:v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const PROJECTS_CSV_URL = environment.projectsCsvUrl;

@Injectable({ providedIn: 'root' })
export class ProjectsCacheService {
  constructor(private sheets: GoogleSheetsService) {}

  async getProjects(): Promise<Project[]> {
    const cached = this.readCache();
    if (cached) {
      return cached;
    }

    const data = await this.sheets.fetchBooksFromSheet(PROJECTS_CSV_URL);
    // Normalize and sort by yearStarted desc to keep consistency
    const projects: Project[] = (data as Project[]).slice().sort((a, b) =>
      a.yearStarted > b.yearStarted ? -1 : b.yearStarted > a.yearStarted ? 1 : 0
    );
    this.writeCache(projects);
    return projects;
  }

  prefetch(): void {
    // Fire and forget; ignore errors to avoid UI disruption
    this.getProjects().catch(() => {});
  }

  private readCache(): Project[] | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { ts: number; data: Project[] };
      if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
      return parsed.data;
    } catch {
      return null;
    }
  }

  private writeCache(data: Project[]): void {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ts: Date.now(), data })
      );
    } catch {
      // ignore storage errors (e.g., quota)
    }
  }
}
