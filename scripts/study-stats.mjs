// Recomputes readingMinutes and figures in public/json/study.json from each
// topic's markdown, and fails if a topic's content or a referenced image is
// missing. Run with `npm run study:stats`.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC_DIR = 'public';
const MANIFEST = join(PUBLIC_DIR, 'json', 'study.json');
// Latin-script words per minute; CJK text is counted per character.
const WORDS_PER_MINUTE = 200;
const CJK_CHARS_PER_MINUTE = 300;

const topics = JSON.parse(readFileSync(MANIFEST, 'utf8'));
let failed = false;

for (const topic of topics) {
  const file = join(PUBLIC_DIR, 'study', topic.slug, 'index.md');
  if (!existsSync(file)) {
    console.error(`missing content: ${file}`);
    failed = true;
    continue;
  }
  const markdown = readFileSync(file, 'utf8');

  const images = [...markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)].map((m) => m[1]);
  for (const src of images) {
    if (!existsSync(join(PUBLIC_DIR, src))) {
      console.error(`${topic.slug}: missing image ${src}`);
      failed = true;
    }
  }

  const cjk = (markdown.match(/[぀-ヿ㐀-鿿]/g) ?? []).length;
  const words = markdown
    .replace(/[぀-ヿ㐀-鿿]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  topic.readingMinutes = Math.max(
    1,
    Math.round(words / WORDS_PER_MINUTE + cjk / CJK_CHARS_PER_MINUTE)
  );
  topic.figures = images.length;
  console.log(
    `${topic.slug.padEnd(44)} ${String(topic.readingMinutes).padStart(3)} min  ${images.length} figures`
  );
}

writeFileSync(MANIFEST, JSON.stringify(topics, null, 2) + '\n');
process.exit(failed ? 1 : 0);
