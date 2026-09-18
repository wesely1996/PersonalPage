import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { TerminalDialogComponent } from '../terminal-dialog/terminal-dialog.component';
import { StudyService, StudyTopic } from '../../services/study/study.service';

export interface StudyTrack {
  readonly name: string;
  // Index of the track's first module in the flat topic list.
  readonly offset: number;
  readonly topics: readonly StudyTopic[];
}

export function groupByTrack(topics: readonly StudyTopic[]): StudyTrack[] {
  const groups = new Map<string, StudyTopic[]>();
  topics.forEach((topic) => {
    const group = groups.get(topic.track) ?? [];
    group.push(topic);
    groups.set(topic.track, group);
  });
  let offset = 0;
  return Array.from(groups, ([name, grouped]) => {
    const track = { name, offset, topics: grouped };
    offset += grouped.length;
    return track;
  });
}

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [TerminalDialogComponent],
  templateUrl: './study.component.html',
  styleUrl: './study.component.scss',
})
export class StudyComponent implements OnInit {
  topics: StudyTopic[] = [];
  tracks: StudyTrack[] = [];
  selected: StudyTopic | null = null;
  loading = true;
  error: string | null = null;

  @ViewChildren('moduleButton')
  private moduleButtons?: QueryList<ElementRef<HTMLButtonElement>>;

  private lastFocused = 0;

  constructor(private readonly study: StudyService) {}

  ngOnInit() {
    this.study.getTopics().subscribe({
      next: (topics) => {
        // Keep tracks contiguous so the flat index used for keyboard
        // navigation matches the on-screen order.
        this.tracks = groupByTrack(topics);
        this.topics = this.tracks.flatMap((t) => t.topics);
        this.loading = false;
      },
      error: () => {
        this.error = 'Could not load the study modules. Check your connection and reload the page.';
        this.loading = false;
      },
    });
  }

  open(topic: StudyTopic, index: number) {
    this.lastFocused = index;
    this.selected = topic;
  }

  close() {
    this.selected = null;
    // Return focus to the module that was open, like a TUI returning to its menu.
    setTimeout(() =>
      this.moduleButtons?.get(this.lastFocused)?.nativeElement.focus()
    );
  }

  onMenuKeydown(event: KeyboardEvent, index: number) {
    const count = this.topics.length;
    let next: number | null = null;
    switch (event.key) {
      case 'ArrowDown':
      case 'j':
        next = (index + 1) % count;
        break;
      case 'ArrowUp':
      case 'k':
        next = (index - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
    }
    if (next !== null) {
      event.preventDefault();
      this.moduleButtons?.get(next)?.nativeElement.focus();
    }
  }

  order(index: number): string {
    return String(index + 1).padStart(2, '0');
  }
}
