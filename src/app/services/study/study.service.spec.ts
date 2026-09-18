import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  StudyService,
  StudyTopic,
  renderStudyMarkdown,
  slugify,
} from './study.service';

describe('renderStudyMarkdown', () => {
  it('builds a table of contents from h2/h3 with unique ids', () => {
    const { html, toc } = renderStudyMarkdown(
      '## Intro\n\ntext\n\n### Setup & tools\n\n## Intro\n\n#### Deep\n'
    );
    expect(toc).toEqual([
      { id: 'intro', text: 'Intro', depth: 2 },
      { id: 'setup-tools', text: 'Setup & tools', depth: 3 },
      { id: 'intro-1', text: 'Intro', depth: 2 },
    ]);
    expect(html).toContain('<h2 id="intro">');
    expect(html).toContain('<h2 id="intro-1">');
    expect(html).toContain('<h4 id="deep">');
  });

  it('renders captioned, numbered figures outside of paragraphs', () => {
    const { html } = renderStudyMarkdown(
      '![A diagram](study/x/a.svg "First")\n\n![B](study/x/b.svg "Second")'
    );
    expect(html).not.toContain('<p><figure');
    expect(html).toContain('alt="A diagram"');
    expect(html).toContain('Figure 1.</span> First');
    expect(html).toContain('Figure 2.</span> Second');
  });

  it('does not double up figure numbers typed into captions', () => {
    const { html } = renderStudyMarkdown('![A](study/x/a.svg "Figure 7: Keys")');
    expect(html).toContain('Figure 1.</span> Keys</figcaption>');
  });

  it('turns labelled blockquotes into callouts and leaves others alone', () => {
    const { html } = renderStudyMarkdown(
      '> **WARNING:** Do not run this as root.\n\n> Just a quote.'
    );
    expect(html).toContain('class="callout callout-warning"');
    expect(html).toContain('<p>Do not run this as root.</p>');
    expect(html).toContain('<blockquote><p>Just a quote.</p>');
  });

  it('escapes code and labels its language', () => {
    const { html } = renderStudyMarkdown('```sql\nSELECT 1 < 2;\n```');
    expect(html).toContain('<div class="code-lang">sql</div>');
    expect(html).toContain('SELECT 1 &lt; 2;');
  });

  it('opens external links in a new tab only', () => {
    const { html } = renderStudyMarkdown('[a](https://x.dev) [b](#intro)');
    expect(html).toContain(
      '<a href="https://x.dev" target="_blank" rel="noopener noreferrer">a</a>'
    );
    expect(html).toContain('<a href="#intro">b</a>');
  });

  it('drops links with unsafe protocols', () => {
    const { html } = renderStudyMarkdown('[x](javascript:alert(1)) [m](mailto:a@b.c)');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="mailto:a@b.c"');
  });

  it('wraps tables in a scroll container', () => {
    const { html } = renderStudyMarkdown('| a | b |\n|---|---|\n| 1 | 2 |');
    expect(html).toContain('<div class="table-wrap"><table>');
    expect(html).toContain('<td>2</td>');
  });
});

describe('slugify', () => {
  it('produces url-safe ids', () => {
    expect(slugify('CAP & PACELC: explained!')).toBe('cap-pacelc-explained');
  });
});

describe('StudyService', () => {
  let service: StudyService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StudyService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('caches the topic manifest', () => {
    const topics = [{ slug: 'a' } as StudyTopic];
    service.getTopics().subscribe();
    service.getTopics().subscribe((t) => expect(t).toEqual(topics));
    http.expectOne('json/study.json').flush(topics);
  });

  it('retries the manifest after a failure', () => {
    service.getTopics().subscribe({ error: () => {} });
    http
      .expectOne('json/study.json')
      .flush('', { status: 500, statusText: 'Server Error' });
    let result: StudyTopic[] | undefined;
    service.getTopics().subscribe((t) => (result = t));
    http.expectOne('json/study.json').flush([]);
    expect(result).toEqual([]);
  });

  it('loads and renders a topic', () => {
    service
      .getContent('sql')
      .subscribe((r) => expect(r.toc[0].text).toBe('Hello'));
    http.expectOne('study/sql/index.md').flush('## Hello');
  });
});
