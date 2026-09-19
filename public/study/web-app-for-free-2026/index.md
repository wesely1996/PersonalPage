You do not need a credit card, a server in your closet, or a computer science degree to put a real web application on the internet. In 2026 the free tiers of a handful of platforms are generous enough to run an app with user accounts, a real Postgres database, an API, automatic deploys and HTTPS, for exactly $0 per month. What you *do* need is a mental model of how the pieces fit, a few habits that keep you safe, and a clear idea of where the free tiers end.

This article takes you from "I can barely code" to a deployed, working app. We will build **LinkShelf**, a tiny bookmark manager: you sign in with GitHub, paste a URL, the server fetches the page title for you, and your bookmarks are stored in a database that nobody else can read. Along the way you will learn *why* each piece exists, so that when a provider changes its pricing (they all do, regularly) you can swap it out without panic.

> **NOTE:** Free tiers change often. Every limit in this article is stated "at the time of writing (2026)" and was checked against the providers' own pages in September 2026. Before you rely on a number, open the provider's pricing page and check it again.

## What a web app actually is

Strip away the buzzwords and a web app is three things talking to each other:

1. **A client**: code running in the user's browser. HTML gives structure, CSS gives looks, JavaScript gives behavior. The browser downloads this code every time (or reuses a cached copy).
2. **A server**: code running on a machine you control (or rent). It does the things the browser must not or cannot do: keep secrets, talk to other services without browser restrictions, enforce rules you cannot trust users to enforce themselves.
3. **A database**: the long-term memory. When the user closes the tab, the database still remembers their bookmarks.

Between them sit a few pieces of internet plumbing that you will configure but rarely think about: **DNS** (the phone book that turns `linkshelf.example.dev` into an IP address), **TLS** (the encryption behind the padlock and `https://`), and a **CDN** (a network of servers around the world that keep copies of your static files close to users).

![Request journey from browser through DNS, CDN edge and API to Postgres](study/web-app-for-free-2026/request-journey.svg "Figure 1: The journey of one request, from typing a URL to a rendered page")

Walk through Figure 1 slowly, because every later section maps onto one of these hops:

- **Steps 1-2, DNS.** Your browser asks a resolver "where is `linkshelf.example.dev`?" The answer is an IP address, cached for a period called the TTL (time to live). This is why DNS changes sometimes take minutes to "propagate": caches around the world are waiting for their TTL to expire.
- **Step 3, CDN edge.** The browser opens an encrypted connection to the nearest edge server and requests `/`. The edge returns `index.html` and your JavaScript bundle, usually straight from cache. These files are identical for every user, which is why they are cheap (often free) to serve.
- **Step 4, API.** The JavaScript now runs in the browser. When it needs *personal* data it calls your API, for example `POST /api/preview`, and attaches a token that proves who the user is.
- **Steps 5-6, database and back.** Server code checks the token, reads or writes rows in the database, and returns JSON. The browser re-renders.

Two terms you will see everywhere:

- **Static hosting** serves files that do not change per user (your built React app). It is almost free to operate, so it is almost always free to use.
- **Serverless / edge functions** run your server code on demand, per request, on someone else's machines. You do not manage an operating system, and when nobody is using your app you are not paying for (or consuming quota on) an idle server.

> **TIP:** When something breaks later, ask "which hop failed?" A DNS problem, a CDN cache problem, an API error and a database permission error look completely different in the browser's Network tab once you know to look for them.

## Choosing a $0 stack in 2026

There are dozens of valid free stacks. Rather than hand you a list of brand names, here are the criteria that actually matter when you are spending nothing:

- **No credit card required.** A platform that never has your card cannot surprise-bill you. This single criterion eliminates a whole class of horror stories.
- **Hard caps, not overage billing.** When you hit a limit, you want things to stop, not to start costing money.
- **Commercial use allowed.** If there is any chance your side project turns into something you charge for, check the terms now. Some free tiers are explicitly personal and non-commercial.
- **No time bombs.** Some free resources expire (a database deleted after 30 days) or sleep aggressively. Fine for experiments, bad for anything people depend on.
- **Boring, portable technology underneath.** Postgres, standard JavaScript, Git. If a provider disappears or changes terms, you can move.

Here is how the popular options look at the time of writing (2026). Numbers are the headline free-tier allowances from each provider's pricing or docs pages; always check the current page.

| Provider | Best for | Free tier headline (2026) | Watch out for |
|---|---|---|---|
| Cloudflare Workers + static assets | Frontend and API at the edge | 100,000 Worker requests/day, 10 ms CPU per invocation; static asset requests free and unlimited | Requests fail once the daily limit is hit (resets 00:00 UTC); tight CPU budget |
| Cloudflare D1 | Small SQLite database next to Workers | 5M rows read/day, 100k rows written/day, 5 GB total storage | SQLite, not Postgres; ties you to Cloudflare |
| Vercel Hobby | Next.js apps | 1M function invocations, 100 GB fast data transfer, 4 active CPU-hours per month | Personal, non-commercial use only; usage paused when exceeded |
| Netlify Free | Static sites plus functions | 300 credits/month (a production deploy costs 15, 1 GB bandwidth costs 20) | All sites pause when credits run out; frequent deploys eat credits |
| GitHub Pages | Pure static sites | 1 GB published site, 100 GB/month soft bandwidth limit | No server-side code at all |
| Supabase Free | Postgres + Auth + Storage | 500 MB database, 50,000 monthly active users, 1 GB file storage, 5 GB egress, 2 active projects | Projects pause after 1 week of inactivity; no backups |
| Neon Free | Serverless Postgres | 0.5 GB storage and 100 CU-hours compute per project per month, up to 100 projects | Compute scales to zero after 5 minutes idle (short wake-up delay) |
| Firebase Spark | NoSQL + Auth, mobile apps | Firestore: 1 GiB storage, 50k reads and 20k writes per day | Cloud Storage requires the pay-as-you-go Blaze plan (since Feb 2026); Blaze has no hard ceiling |
| Render Free | Long-running Node/Python servers | 750 free instance hours/month | Sleeps after 15 min idle, about a minute to wake; free Postgres expires 30 days after creation |
| Fly.io | Containers and VMs | No free tier for new accounts, only a short trial | Pay as you go after the trial |

### The stack we will use

For LinkShelf we pick:

- **Frontend:** React + TypeScript, built with **Vite**. React is not the only choice (Angular, Vue and Svelte are all great) but it has the most tutorials and AI-assistant training data, which matters when you are a beginner.
- **Hosting and API:** **Cloudflare Workers** with static assets. One deploy serves both the React build and the `/api/*` routes, on the same domain. No credit card needed, static traffic is unmetered, commercial use is fine, and Workers start in milliseconds instead of waking from a sleep.
- **Database and auth:** **Supabase**. You get a real Postgres database, a login system with GitHub/Google/email providers, and an auto-generated REST API protected by Postgres Row Level Security.
- **Code and CI/CD:** **GitHub** and **GitHub Actions**. Public repositories get free hosted runner minutes; private repositories on the Free plan get a monthly allowance (2,000 Linux minutes at the time of writing).
- **Observability:** **Sentry** (free Developer plan) for errors, **Cloudflare Web Analytics** for privacy-friendly traffic stats, **UptimeRobot** for uptime pings.

![Architecture of the zero-dollar stack](study/web-app-for-free-2026/stack-architecture.svg "Figure 2: The stack used in this article and how the pieces talk to each other")

Notice one design decision in Figure 2: the browser talks to Supabase **directly** for reading and writing bookmarks. There is no "backend" in between for simple data access. That sounds dangerous until you understand Row Level Security (coming up), which moves the authorization rules into the database itself. We only write server code for the one thing the browser genuinely cannot do: fetching another website's HTML to read its title (browsers block that with CORS, and it would leak the user's IP to arbitrary sites anyway).

> **NOTE:** Vercel, Netlify and Neon are excellent alternatives. If you prefer Next.js, Vercel Hobby plus Supabase or Neon is a very common pairing, as long as your project is personal and non-commercial. The concepts in this article transfer one to one.

## Setting up your workshop

You need five tools. All are free.

1. **Node.js (LTS).** The JavaScript runtime that powers your build tools. At the time of writing Node 24 is the Active LTS line (Node 26 is scheduled to become LTS in late October 2026). Install it with a version manager so you can switch later: `fnm` or `nvm` on macOS/Linux, `fnm` or the official installer on Windows.
2. **Git.** Version control: a time machine and a collaboration tool in one.
3. **VS Code** (or any editor you like). Add the ESLint and Prettier extensions.
4. **A GitHub account.** Your code lives here, and GitHub Actions will deploy it.
5. **Accounts on Cloudflare and Supabase.** Both offer sign-up without a card. Sign in with GitHub to keep things simple.

Verify the installs:

```bash
node --version    # v24.x.x
npm --version
git --version
```

Then tell Git who you are, once per machine:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
```

### The five Git commands you will actually use

Git has hundreds of commands. For a solo project you need five:

```bash
git status                      # what changed?
git add -A                      # stage everything that changed
git commit -m "Add bookmark list"   # save a snapshot with a message
git push                        # upload snapshots to GitHub
git switch -c feat/tags         # start a new branch for a new idea
```

Commit small and often. A commit is a save point; you can always go back.

### Create the project

```bash
npm create vite@latest linkshelf -- --template react-ts
cd linkshelf
npm install
npm install @supabase/supabase-js
npm install -D wrangler supabase
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). You should see the starter page. Now put it on GitHub: create an empty repository called `linkshelf` on github.com, then:

```bash
git init
git add -A
git commit -m "Scaffold Vite React app"
git remote add origin https://github.com/YOUR-USER/linkshelf.git
git push -u origin main
```

> **TIP:** The Vite template ships a `.gitignore` that already excludes `node_modules` and `dist`. Open it now and add `.env.local` and `.dev.vars`. You will thank yourself in the secrets section.

## Designing the app and its database

Before writing UI, decide what data exists. This is the single most valuable habit in web development: **the schema is the app**. Screens come and go; data lives forever.

LinkShelf needs:

- **users**: handled for us by Supabase Auth in a table called `auth.users`. We never create our own password table.
- **collections**: optional folders ("Reading list", "Recipes").
- **bookmarks**: a URL, a title, a note, some tags, and who owns it.

![Entity relationship diagram of users, collections and bookmarks](study/web-app-for-free-2026/schema-erd.svg "Figure 3: The LinkShelf schema - every row carries its owner's user_id")

### Create the Supabase project

In the Supabase dashboard create a new project, choose the region closest to you and your users, and save the database password in a password manager. Then, from the project settings, note two values:

- the **project URL**, like `https://abcdefghijklm.supabase.co`
- the **publishable key**, which starts with `sb_publishable_`

Supabase introduced publishable (`sb_publishable_...`) and secret (`sb_secret_...`) keys to replace the older `anon` and `service_role` keys, which are being deprecated. The publishable key is designed to ship in browser code. The secret key bypasses all security rules and must never leave a server. For LinkShelf we will not need the secret key at all.

### Migrations: schema as code

You could click tables together in the dashboard, but then your schema lives only in one place and nobody (including future you) knows how it got there. Instead, write **migrations**: numbered SQL files, committed to Git, applied in order.

```bash
npx supabase init
npx supabase login
npx supabase link --project-ref abcdefghijklm
npx supabase migration new init_schema
```

That last command creates `supabase/migrations/<timestamp>_init_schema.sql`. Fill it in:

```sql
-- Collections: optional folders for bookmarks
create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  created_at  timestamptz not null default now()
);

-- Bookmarks: the core of the app
create table public.bookmarks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid()
                 references auth.users (id) on delete cascade,
  collection_id  uuid references public.collections (id) on delete set null,
  url            text not null
                 check (url ~* '^https?://' and char_length(url) <= 2048),
  title          text check (char_length(title) <= 300),
  note           text check (char_length(note) <= 2000),
  tags           text[] not null default '{}',
  created_at     timestamptz not null default now()
);

create index bookmarks_user_created_idx
  on public.bookmarks (user_id, created_at desc);
```

A few choices worth understanding:

- **`uuid` primary keys** instead of `1, 2, 3...`: they do not reveal how many rows you have, and clients can never guess another user's IDs by counting.
- **`default auth.uid()`** on `user_id`: the database fills in the owner from the caller's login token. The browser never gets to *claim* an owner.
- **`check` constraints**: the database is the last line of defense. Even if your frontend validation has a bug, a 10 MB "note" cannot be inserted.
- **`on delete cascade`**: when a user deletes their account, their data goes with it. That is both good hygiene and, in many jurisdictions, a legal expectation.
- **The index** matches the one query we run constantly: "this user's bookmarks, newest first".

### Grants: who may even try

Postgres has two layers of permission. **Grants** decide which roles may touch a table at all. **Row Level Security (RLS)** decides which rows they see. Supabase maps every request to a role: `anon` for logged-out callers, `authenticated` for logged-in ones.

This changed in 2026: new Supabase projects (since May 30, 2026, and existing projects from October 30, 2026) no longer automatically expose new tables in the `public` schema to the Data API. You grant access explicitly, which is better: your permissions are now visible in your migrations.

```sql
-- Only logged-in users may use these tables at all. anon gets nothing.
grant select, insert, update, delete on public.collections to authenticated;
grant select, insert, update, delete on public.bookmarks   to authenticated;
```

If you forget this step you will see `permission denied for table bookmarks` in the browser. That error is your friend: it failed closed.

### Row Level Security: the rule that makes direct database access safe

Here is the key idea of this whole architecture. The browser holds a publishable key that anyone can read in DevTools. So what stops a curious user from running `select * from bookmarks` and reading everybody's data? **RLS policies**, which Postgres evaluates for every single row of every single query.

```sql
alter table public.collections enable row level security;
alter table public.bookmarks   enable row level security;

-- Collections: owners only
create policy "collections: owner reads" on public.collections
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "collections: owner inserts" on public.collections
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "collections: owner updates" on public.collections
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "collections: owner deletes" on public.collections
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Bookmarks: owners only, and only into their own collections
create policy "bookmarks: owner reads" on public.bookmarks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "bookmarks: owner inserts" on public.bookmarks
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and (collection_id is null or exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    ))
  );
create policy "bookmarks: owner updates" on public.bookmarks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (collection_id is null or exists (
      select 1 from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    ))
  );
create policy "bookmarks: owner deletes" on public.bookmarks
  for delete to authenticated using ((select auth.uid()) = user_id);
```

- **`using`** filters which existing rows a query can see or touch.
- **`with check`** validates the *new* version of a row on insert or update. Without it, a user could update a bookmark's `user_id` to someone else's, or file their bookmark into another user's collection.
- **`(select auth.uid())`** instead of bare `auth.uid()` lets Postgres evaluate the function once per query instead of once per row. Same result, faster on big tables.

![Row level security filters the same query differently per caller](study/web-app-for-free-2026/rls-filter.svg "Figure 4: Same SQL, different rows - RLS runs inside the database for every caller")

Apply the migration:

```bash
npx supabase db push
```

> **WARNING:** A table in an exposed schema without RLS enabled is readable by anyone who has been granted access to it. Supabase's dashboard flags such tables in its Security Advisor. Make "enable RLS + write policies" part of every table's first migration, never a later cleanup task.

> **EXERCISE:** In the Supabase SQL editor, insert a bookmark while impersonating one user (the SQL editor has a role selector), then switch to a different user and run `select * from bookmarks`. Confirm you get zero rows, not an error. Then try to `update` the first user's bookmark from the second user and observe that zero rows change.

## Authentication with GitHub login

Never build your own password system for a side project. Password storage, reset emails, brute-force protection and session handling are each easy to get subtly wrong. Supabase Auth does it for you, and "Sign in with GitHub" means you never store a password at all.

### Wire up the GitHub provider

1. On GitHub: **Settings > Developer settings > OAuth Apps > New OAuth App**. Set the homepage URL to your app and the **Authorization callback URL** to `https://abcdefghijklm.supabase.co/auth/v1/callback` (your project URL plus `/auth/v1/callback`).
2. Copy the Client ID and generate a Client Secret.
3. In Supabase: **Authentication > Providers > GitHub**, enable it and paste both values. The client secret stays inside Supabase; it never touches your code.
4. In **Authentication > URL Configuration**, set the Site URL to your production URL and add `http://localhost:5173` to the allowed redirect URLs.

### What actually happens when you click "Sign in"

![Sequence diagram of OAuth login and authenticated API calls](study/web-app-for-free-2026/auth-flow.svg "Figure 5: OAuth login, then every request carries a short-lived JWT")

Follow Figure 5:

1. The browser calls `supabase.auth.signInWithOAuth({ provider: 'github' })` and is redirected.
2. GitHub asks the user to approve access.
3. GitHub redirects back to Supabase with a one-time code.
4. Supabase exchanges that code with GitHub, creates or finds the user in `auth.users`, and redirects to your app with a **session**: a short-lived **access token** (a JWT) and a long-lived **refresh token**.
5. From now on, `supabase-js` attaches the access token to every database request.
6. Postgres reads the user ID out of the verified token (`auth.uid()`) and RLS does the rest.
7. When the browser calls our own Worker, it sends the same token in an `Authorization: Bearer ...` header.
8. The Worker asks Supabase Auth whether the token is valid.
9. Supabase returns the user; the Worker proceeds.

A **JWT** (JSON Web Token) is a signed JSON object: `{ "sub": "<user id>", "role": "authenticated", "exp": ... }` plus a signature. Anyone can *read* it (it is only base64-encoded), but nobody can *change* it without invalidating the signature. That is why the server can trust `sub` without a database lookup, and why you must never put secrets inside a JWT.

The access token expires after a short time (one hour by default in Supabase), which limits the damage if one leaks. `supabase-js` refreshes it automatically using the refresh token.

> **NOTE:** Magic-link email login is the other popular option. Be aware that Supabase's built-in email sender is heavily rate-limited and intended for testing; for real email login, configure a custom SMTP provider (several transactional email services have free tiers). Check the current limits in the Supabase Auth docs.

## Building the frontend and the API

### The Supabase client

Create `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
}

export const supabase = createClient(url, key);
```

And `.env.local` in the project root (already in `.gitignore`, right?):

```text
VITE_SUPABASE_URL=https://abcdefghijklm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxx
```

Vite only exposes variables prefixed with `VITE_` to browser code, and it bakes them into the bundle at **build time**. That prefix is a deliberate speed bump: it forces you to think "am I OK with the whole world reading this?" every time.

### The app component

Replace `src/App.tsx`:

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

type Bookmark = { id: string; url: string; title: string | null; created_at: string };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <p>Loading...</p>;
  if (!session) {
    return (
      <main>
        <h1>LinkShelf</h1>
        <button
          onClick={() =>
            supabase.auth.signInWithOAuth({
              provider: 'github',
              options: { redirectTo: window.location.origin },
            })
          }
        >
          Sign in with GitHub
        </button>
      </main>
    );
  }
  return <Shelf session={session} />;
}

function Shelf({ session }: { session: Session }) {
  const [items, setItems] = useState<Bookmark[]>([]);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id, url, title, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) setError(error.message);
    else setItems(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ url }),
      });
      const { title } = res.ok ? await res.json() : { title: null };
      const { error } = await supabase.from('bookmarks').insert({ url, title });
      if (error) throw error;
      setUrl('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    if (error) setError(error.message);
    else setItems((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <main>
      <header>
        <h1>LinkShelf</h1>
        <span>{session.user.email}</span>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>
      <form onSubmit={add}>
        <input
          type="url"
          required
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <ul>
        {items.map((b) => (
          <li key={b.id}>
            <a href={b.url} target="_blank" rel="noopener noreferrer">
              {b.title ?? b.url}
            </a>
            <button onClick={() => remove(b.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

Things to notice:

- **We never send `user_id`.** The database default fills it from the token and the RLS `with check` verifies it. The client cannot lie about ownership because it never gets to say.
- **`.limit(100)`** caps how much data one request can pull. Unbounded queries are a classic free-tier quota killer.
- **`rel="noopener noreferrer"`** on user-supplied links stops the opened page from controlling your tab through `window.opener`.
- **React escapes text by default.** A bookmark title of `<script>alert(1)</script>` renders as harmless text. Never bypass this with `dangerouslySetInnerHTML` on user data.
- **Errors are shown, not swallowed.** A beginner's most common bug is an ignored `error` object from `supabase-js`, which returns errors instead of throwing them.

### The API: one Cloudflare Worker

The only server code we need fetches a page title. Create `worker/index.ts`:

```ts
interface Env {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  ASSETS: Fetcher;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/health') return json({ ok: true });
    if (pathname === '/api/preview' && request.method === 'POST') {
      return preview(request, env);
    }
    if (pathname.startsWith('/api/')) return json({ error: 'not found' }, 404);

    // Anything else: serve the React app
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function getUserId(request: Request, env: Env): Promise<string | null> {
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;

  // Ask Supabase Auth to validate the token and tell us who it belongs to
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization: header },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string };
  return user.id ?? null;
}

async function preview(request: Request, env: Env): Promise<Response> {
  const userId = await getUserId(request, env);
  if (!userId) return json({ error: 'unauthorized' }, 401);

  let target: URL;
  try {
    const body = (await request.json()) as { url?: unknown };
    target = new URL(String(body.url));
  } catch {
    return json({ error: 'invalid url' }, 400);
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return json({ error: 'invalid url' }, 400);
  }

  try {
    const res = await fetch(target.toString(), {
      headers: { 'user-agent': 'LinkShelfBot/1.0 (+https://linkshelf.example.dev)' },
      signal: AbortSignal.timeout(5000),
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('text/html')) return json({ title: null });

    const html = await readLimited(res, 100_000);
    const match = html.match(/<title[^>]*>([^<]{1,300})<\/title>/i);
    return json({ title: match ? match[1].trim() : null });
  } catch {
    return json({ title: null });
  }
}

// Read at most `max` characters, then stop downloading
async function readLimited(res: Response, max: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let out = '';
  while (out.length < max) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => {});
  return out;
}
```

This small file demonstrates most of what "backend" means:

- **Authenticate first.** The very first thing `preview` does is find out who is calling. Without that line, anyone on the internet could use your Worker as a free proxy and burn your daily request quota.
- **Validate input.** Parse the URL, allow only `http` and `https`. Never pass user input straight into a `fetch`, a SQL string or a shell command.
- **Bound everything.** A 5-second timeout and a 100 KB read limit mean a malicious or slow site cannot hang your Worker or eat its CPU budget (10 ms of CPU per invocation on the free plan; waiting on the network does not count as CPU, but parsing does).
- **Fail soft.** If the title cannot be fetched, the user can still save the bookmark.

Why validate the token by calling `/auth/v1/user` instead of verifying the JWT locally? Simplicity and correctness: Supabase checks the signature, expiry and whether the session was revoked. The cost is one extra network hop. Once you are comfortable, Supabase's docs describe verifying tokens locally against the project's published signing keys, which is faster.

### Wrangler configuration

Create `wrangler.jsonc` in the project root:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "linkshelf",
  "main": "worker/index.ts",
  "compatibility_date": "2026-09-01",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  },
  "vars": {
    "SUPABASE_URL": "https://abcdefghijklm.supabase.co",
    "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_xxxxxxxxxxxxxxxx"
  }
}
```

The `assets` block is the clever part. Requests for real files in `dist/` are served straight from Cloudflare's cache **without running your Worker at all**, which means they do not count against the 100,000 daily Worker requests. `run_worker_first` sends only `/api/*` to your code. `single-page-application` makes unknown paths like `/settings` return `index.html` so client-side routing works on refresh.

Run `npx wrangler types` to generate TypeScript types for `Env`, `Fetcher` and `ExportedHandler`, and include the generated file in a `tsconfig` for the `worker/` folder.

### Running it locally

Tell Vite to forward `/api` calls to the local Worker. In `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8787' },
  },
});
```

Then use two terminals:

```bash
# terminal 1: the Worker API on :8787
npx wrangler dev

# terminal 2: the React dev server on :5173 with hot reload
npm run dev
```

Sign in, paste `https://developer.mozilla.org/`, and watch the title appear. Commit.

> **TIP:** Cloudflare also publishes a Vite plugin that runs your Worker inside the Vite dev server, so one command does both. It is worth trying once the two-terminal setup makes sense to you, because it hides exactly the plumbing you are trying to learn.

## Configuration, environment variables and secrets

Every app has values that differ between your laptop and production, and a few that must stay secret. Mixing these up is the most common way beginners leak credentials. The rule is simple once you see it laid out.

![Map of public variables, Worker runtime variables and CI secrets](study/web-app-for-free-2026/secrets-map.svg "Figure 6: Where each configuration value lives in LinkShelf")

**Public values** end up in the JavaScript bundle. Anyone can open DevTools and read them. That is fine for the Supabase URL and publishable key, *but only because RLS protects every table*. The key identifies your project; it does not grant power on its own.

**Runtime values** are available to server code only. For Workers, non-sensitive values go in `vars` in `wrangler.jsonc`; sensitive ones are set with:

```bash
npx wrangler secret put SOME_API_KEY
```

Locally, Wrangler reads secrets from a `.dev.vars` file (gitignored). Notice that LinkShelf's Worker needs no secret at all: it forwards the *user's* token, so it can only ever do what that user could do. This is a pattern worth copying. A Worker holding the Supabase secret key would be a skeleton key to your entire database, and every bug in it would become a data breach.

**CI secrets** are credentials your deploy pipeline needs: a Cloudflare API token, a Supabase access token and database password. They live in **GitHub > Settings > Secrets and variables > Actions**, are encrypted at rest, and are masked in logs.

Rules to live by:

- A secret committed to Git is compromised, even if you delete it in the next commit. Git history is forever, and bots scan public GitHub for keys within minutes. **Rotate** it (generate a new one, revoke the old one).
- Create **scoped tokens**. Your Cloudflare token for CI should be allowed to edit Workers on one account, not manage DNS for every domain you own.
- Enable GitHub **secret scanning and push protection** on your repository; it blocks many known key formats before they are pushed.
- Keep a `.env.example` in Git with the variable *names* and fake values, so collaborators (and future you) know what is needed.

## Shipping it: deploy, domain, HTTPS and CI/CD

### First deploy by hand

Do the first deploy manually, so you understand what CI will automate later:

```bash
npx wrangler login
npm run build          # tsc + vite build -> dist/
npx wrangler deploy
```

Wrangler prints a URL like `https://linkshelf.YOUR-SUBDOMAIN.workers.dev`. That is a live, HTTPS-secured app on a global network. Add that URL to Supabase's **Site URL** and **Redirect URLs**, and to your GitHub OAuth App's homepage URL, then sign in on production.

### Domains: what is free and what is not

A `*.workers.dev` subdomain is free, has HTTPS, and is perfectly fine for a portfolio or a tool for friends. The same goes for `*.pages.dev`, `*.vercel.app`, `*.netlify.app` and `*.github.io` on the other platforms. This is what "custom-ish domain" means on a $0 budget.

A domain of your own is the one thing in this article that usually costs money: roughly $10-15 per year for a common `.com` or `.dev` at the time of writing, and some registrars (Cloudflare Registrar included) sell at cost with no markup. A few community projects hand out free subdomains to developers (for example, services that give you `yourname.is-a.dev` through a GitHub pull request); read their rules, since they can revoke names that break them.

If you do buy a domain, the steps are:

1. Add the domain to Cloudflare (the free plan is enough) and change your registrar's nameservers to the two Cloudflare gives you.
2. In the Worker's settings, add a **Custom Domain** such as `linkshelf.example.dev`. Cloudflare creates the DNS record and the TLS certificate for you.
3. Update the Supabase URL configuration and the GitHub OAuth App to the new domain.

DNS vocabulary you will meet:

| Record | Meaning | Example |
|---|---|---|
| `A` / `AAAA` | Name points to an IPv4 / IPv6 address | `example.dev -> 203.0.113.10` |
| `CNAME` | Name is an alias for another name | `www -> example.dev` |
| `TXT` | Free-form text, used to prove ownership and for email security | `v=spf1 ...` |
| `MX` | Where email for the domain is delivered | `mx1.mailprovider.com` |
| `NS` | Which servers are authoritative for the domain | `ada.ns.cloudflare.com` |

HTTPS is no longer something you configure by hand. Every platform in this article issues and renews TLS certificates automatically (typically from Let's Encrypt or Google Trust Services). Your only job is to never serve anything over plain `http://`.

### CI/CD with GitHub Actions

Manual deploys work until the day you deploy from the wrong branch, forget to run the migration, or push a typo that breaks the build. **CI** (continuous integration) runs checks on every change. **CD** (continuous deployment) ships every change that passes. Together they make deploying boring, which is exactly what you want.

![Pipeline from branch and pull request through CI checks to deploy](study/web-app-for-free-2026/cicd-pipeline.svg "Figure 7: The PR pipeline checks every change; the main pipeline migrates and deploys")

**Secrets and variables for the workflow.** In **GitHub > Settings > Secrets and variables > Actions**:

- **Variables** (not secret, visible in logs): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Secrets**: `CLOUDFLARE_API_TOKEN` (create one in the Cloudflare dashboard from the "Edit Cloudflare Workers" template), `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_ACCESS_TOKEN` (from your Supabase account settings), `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` (the project ref).

**The workflow.** Create `.github/workflows/ci.yml`:

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}

  deploy:
    needs: check
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    concurrency: production
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
      - run: npm ci

      - name: Apply database migrations
        run: |
          npx supabase link --project-ref "$SUPABASE_PROJECT_ID"
          npx supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy

      - name: Smoke test
        run: curl --fail --silent https://linkshelf.YOUR-SUBDOMAIN.workers.dev/api/health
```

Reading it top to bottom:

- **Two triggers.** Every pull request runs `check`. Only a push to `main` (a merge) runs `deploy`.
- **`permissions: contents: read`** gives the workflow's built-in token the minimum rights. Least privilege applies to robots too.
- **`needs: check`** means a broken build can never deploy.
- **`concurrency: production`** ensures two merges in quick succession deploy one after the other, not on top of each other.
- **Migrations run before the new code ships.** Write migrations that are *additive* (add a column, then start using it in a later deploy) so the old code keeps working during the few seconds between steps.
- **The smoke test** fails the pipeline loudly if the live site does not answer.

Finally, protect `main`: in **Settings > Branches** (or Rulesets), require pull requests and require the `check` job to pass. Now even you cannot push a broken build straight to production.

> **TIP:** For preview environments, Wrangler can upload a new version without promoting it to production (`npx wrangler versions upload`) and, with preview URLs enabled, gives you a unique URL to click through before merging. Point it at a separate Supabase project (you get two active projects for free) so previews never touch production data.

### What about tests?

Add tests early, even a few. Vitest works out of the box with Vite. Start by testing pure functions (for example, extract the title-parsing regex into a function and test it against tricky HTML), then add one end-to-end test with Playwright that signs in against a test project and saves a bookmark. Put `npm test` into the `check` job. For public repositories, hosted runner minutes are free, so there is no reason to skip CI.

## Running it for $0: monitoring, limits and bills

### Know when it breaks: monitoring on free plans

An app with users needs three kinds of visibility:

- **Errors.** Sentry's free Developer plan (at the time of writing: one user, around 5,000 errors per month, 30-day retention) catches exceptions in the browser with stack traces and the user's browser details. Install `@sentry/react`, call `Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN })` in `main.tsx`, and upload source maps in CI so stack traces point to your real code rather than minified bundles.
- **Traffic.** Cloudflare Web Analytics is free and cookie-free, which also means no consent banner is needed for it in most setups. Vercel and Netlify offer similar built-in analytics with free allowances.
- **Uptime.** UptimeRobot's free plan (50 monitors at 5-minute intervals at the time of writing) can ping `/api/health` and email you when it fails. A health endpoint that also runs a trivial database query tells you when the *database* is down, not just the Worker.

For live debugging, `npx wrangler tail` streams your production Worker's logs to your terminal in real time. Supabase has log explorers for the API, Auth and Postgres in its dashboard.

### Free-tier gotchas

Free tiers are generous but not infinite, and each provider fails differently when you hit the edge.

![Map of six common free-tier traps and their fixes](study/web-app-for-free-2026/free-tier-gotchas.svg "Figure 8: The free-tier traps that catch most beginners, and the defense for each")

**Sleeping databases.** Supabase pauses free projects after one week of inactivity. The data is kept, and you can restore the project from the dashboard, but the app is down until you do. Neon takes a different approach: compute scales to zero after five minutes idle and wakes on the next query, costing that first request a short delay. Some people schedule a periodic ping to keep a free database awake; before you do, read the provider's terms and ask whether an app nobody used for a week needs to be instantly available.

**Cold starts.** Container-based free tiers sleep. Render's free web services spin down after 15 minutes without traffic and take about a minute to wake, so the first visitor stares at a spinner. Edge runtimes like Workers use lightweight isolates that start in milliseconds, which is one reason we chose them.

**Hard caps.** On the free plans in our table, exceeding a limit stops the service rather than billing you: Workers requests fail with an error after 100,000 per day until 00:00 UTC; Netlify pauses all your sites when the 300 monthly credits run out; Vercel Hobby pauses usage when you exceed an included allowance. "Free forever" really does mean free, but it also means "down" if you go viral.

**Expiring resources.** Render's free Postgres expires 30 days after creation (with a grace period to upgrade before deletion). Fly.io no longer has a free tier for new accounts, only a short trial. Great for learning, wrong for anything you want to keep.

**Terms of use.** Vercel Hobby is restricted to personal, non-commercial use. If you add a "Buy" button, you need a different plan or a different host.

**Surprise bills.** The danger zone is pay-as-you-go plans with no ceiling, such as Firebase Blaze or any cloud account with a card attached. One infinite loop that writes to a database, or one scraper hammering an unauthenticated endpoint, can generate a real invoice.

### How not to get surprise-billed

- **Prefer plans that never had your card.** Cloudflare Workers Free, Supabase Free, GitHub Free and Sentry Developer all work without payment details at the time of writing.
- **If you must add a card, set a budget alert first**, before you deploy anything. Most clouds let you alert at a low amount such as $1.
- **Cache static content** so it does not consume function invocations. We did this with Workers static assets.
- **Authenticate every endpoint that costs something**, and cap every query (`.limit()`).
- **Check your usage dashboards weekly** for the first month. You will quickly learn what "normal" looks like.
- **Keep backups yourself.** The Supabase free plan has no backups. A weekly GitHub Action that runs `supabase db dump` and stores the output as an encrypted artifact (or in a private repository) costs nothing and might save your project.

> **EXERCISE:** Estimate your quota usage. If each active user loads the app five times a day and each load triggers two `/api/*` calls, how many daily active users fit in 100,000 Worker requests per day? (Answer: 10,000, because static files do not count.) Now estimate database egress: at about 20 KB per bookmark list, how many loads fit in 5 GB per month?

## Security basics for a tiny app

Small apps get attacked too, mostly by automated bots that do not care how popular you are. You do not need to be a security expert, but you need to know the handful of mistakes that account for most breaches. The OWASP Top 10 is the standard list; here are the entries that matter most for an app like LinkShelf.

**Broken access control** (OWASP's number one). A user reaches data or actions that are not theirs. Our defense is RLS with `using` *and* `with check` on every table, explicit grants to `authenticated` only, and never trusting a `user_id` sent by the client. Test it: sign in as two different users and try to read, update and delete each other's rows.

**Injection.** User input interpreted as code: SQL, HTML, shell commands. `supabase-js` sends parameters separately from the query, React escapes text by default, and our Worker only accepts parsed `http(s)` URLs. If you ever write raw SQL in a Postgres function, use parameters, never string concatenation.

**Cryptographic failures and secret exposure.** Covered in the secrets section: HTTPS everywhere, secrets never in Git, rotate on leak, secret keys never in the browser.

**Security misconfiguration.** Tables without RLS, debug endpoints left on, wide-open CORS, overly powerful API tokens. Run the Supabase Security Advisor after each migration.

**Server-side request forgery (SSRF).** Our `/api/preview` endpoint fetches URLs that users give it, which is exactly the shape of an SSRF risk: an attacker tries to make your server request internal addresses. On a traditional server you must block private IP ranges yourself. Workers run on Cloudflare's network with no private network of yours behind them, which removes the worst case, but keep the other defenses: authentication, protocol allow-list, timeouts and size limits.

### CORS in one paragraph

Browsers block JavaScript on one origin (scheme + host + port) from reading responses from another origin unless that server opts in with `Access-Control-Allow-*` headers. Because our Worker serves the frontend *and* the API from the same origin, we need no CORS configuration at all, which is one less thing to misconfigure. If you do split frontend and API across domains, allow exactly your frontend's origin, never `*` together with credentials. Remember that CORS protects *users' browsers*, not your server: `curl` ignores it completely, so it is never a substitute for authentication.

### Rate limiting

Authentication stops strangers; rate limiting stops a single account (or a stolen token) from hammering you. Supabase Auth applies its own rate limits to sign-in and token endpoints. For your Worker, Cloudflare offers a rate-limiting binding for Workers and WAF rate-limiting rules; check what your plan includes at the time you build. A simple policy such as "30 previews per user per minute" protects both your quota and the sites you fetch from.

### Security headers

Workers static assets support a `_headers` file (put it in `public/` so Vite copies it into `dist/`). A good starting point:

```text
/*
  Content-Security-Policy: default-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data:; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

The Content Security Policy tells the browser which origins your page may load code from and talk to, which turns many XSS bugs from "full account takeover" into "blocked request". If you add Sentry or analytics scripts, add their domains to the relevant directives, and test in the browser console, which reports every CSP violation.

> **WARNING:** Dependencies are attack surface. Run `npm audit` occasionally, enable Dependabot alerts in GitHub, and be suspicious of packages with tiny download counts or names one letter away from a popular package. Commit your `package-lock.json` and use `npm ci` in CI so builds install exactly what you tested.

## AI coding assistants, used responsibly

In 2026 you will almost certainly build with an AI assistant in your editor or terminal. Used well, it is like pairing with a tireless senior developer who has read every tutorial. Used carelessly, it is how beginners ship apps with open databases and leaked keys. A few rules:

- **You own every line.** If you cannot explain what a piece of generated code does, you are not ready to deploy it. Ask the assistant to explain it, line by line, until you can.
- **Give it context and constraints.** "Add a tags filter to the bookmarks list. Use supabase-js, keep RLS as is, no new dependencies, and add a migration if the schema changes" produces far better code than "add tags".
- **Make it work in small steps you can review.** One feature per branch, one pull request, CI green, then merge. The same discipline you use for your own code applies with even more force to code you did not type.
- **Check security-sensitive output twice.** Assistants frequently "fix" a permission error by disabling RLS, granting to `anon`, using a secret key in the browser or setting CORS to `*`. Each of those makes the error go away by removing the protection. When an assistant touches auth, policies, secrets or CORS, review with extra suspicion.
- **Never paste secrets into prompts.** Treat chat history as potentially visible to others. Use placeholder values and keep real keys in `.env.local`.
- **Verify facts that drift.** Package versions, API signatures and especially pricing and free-tier limits change faster than any model's training data. When an assistant says "the free tier includes X", check the provider's page.
- **Use it to learn, not just to produce.** Ask "why RLS instead of checks in the API?", "what would break if I removed `with check`?", "write a test that proves user B cannot read user A's bookmarks". The last one is especially valuable: let the assistant attack your own app.

> **EXERCISE:** Ask your assistant to review your migration file for security problems, then deliberately introduce one (remove the `with check` on the bookmarks update policy) and see whether it catches it. Revert afterwards.

## When you outgrow free

Outgrowing a free tier is a good problem: it means people use your app. The trick is to upgrade one bottleneck at a time, based on evidence from your usage dashboards, not on vague worry.

![Timeline of stages from free prototype to paid scaling](study/web-app-for-free-2026/scaling-path.svg "Figure 9: A realistic scaling path - pay only when a specific limit starts to hurt")

A typical path, with approximate prices at the time of writing (2026):

1. **Stage 0: $0.** Everything in this article. Perfect for learning, portfolios and tools for a few friends.
2. **Stage 1: a domain (about $10-15 per year).** The moment you share the app publicly, a real domain builds trust and makes you independent of any one platform's subdomain.
3. **Stage 2: Cloudflare Workers Paid (about $5 per month).** When you approach 100,000 requests per day or the 10 ms CPU limit starts failing requests. At the time of writing it includes 10 million requests per month and far more CPU time, with low per-unit overage pricing.
4. **Stage 3: Supabase Pro (about $25 per month).** When real people depend on the data: no more pausing, daily backups, more database space and email support. Spend here before anywhere else once data matters, because losing users' data is the one mistake you cannot fix with a deploy.
5. **Stage 4: usage-based scaling.** Read replicas, queues for slow work (such as fetching titles in the background instead of during the request), caching hot queries, team plans for collaborators. By now revenue or a sponsor should pay for it.

Because we chose portable building blocks, every stage is a change of plan, not a rewrite. Postgres is Postgres wherever it runs; `supabase db dump` gives you a standard SQL file. The frontend is a folder of static files that any host can serve. The Worker is a standard `fetch` handler; moving it to another runtime is a small adapter, not a new app.

Signs you are optimizing too early: buying paid plans "just in case", adding Kubernetes, microservices or a message queue to an app with ten users, or spending more time on infrastructure than on features. The free stack above can serve thousands of daily users.

## Cheat sheet

| Topic | Remember |
|---|---|
| Request journey | DNS -> CDN edge (static, cached) -> API (auth, logic) -> DB (RLS) -> JSON back |
| Stack | Vite + React + TS, Cloudflare Workers + static assets, Supabase (Postgres + Auth), GitHub Actions |
| Project setup | `npm create vite@latest app -- --template react-ts`, `npm i @supabase/supabase-js`, `npm i -D wrangler supabase` |
| Migrations | `npx supabase migration new name`, edit SQL, `npx supabase db push` |
| New table checklist | uuid PK, `user_id default auth.uid()`, check constraints, index, explicit `grant ... to authenticated`, enable RLS, 4 policies |
| RLS | `using` filters existing rows; `with check` validates new rows; use `(select auth.uid())` |
| Keys | `sb_publishable_` = browser OK (with RLS); `sb_secret_` = server only, never in Git |
| Env vars | `VITE_*` = public at build time; Worker `vars` = plain config; `wrangler secret put` = secrets; `.dev.vars` locally |
| Auth | OAuth via Supabase; short-lived JWT access token + refresh token; send `Authorization: Bearer <jwt>` |
| Worker | Authenticate first, validate input, timeouts + size limits, fail soft |
| Assets | `run_worker_first: ["/api/*"]` so static files skip the Worker and its quota |
| Deploy | `npm run build && npx wrangler deploy`; free `*.workers.dev` URL with HTTPS |
| CI/CD | PR: lint + build (+ tests). main: migrate -> build -> deploy -> smoke test. Protect `main` |
| Monitoring | Sentry (errors), Cloudflare Web Analytics (traffic), UptimeRobot (`/api/health`), `wrangler tail` |
| Free-tier traps | Sleeping DBs, cold starts, hard caps, expiring resources, non-commercial terms, uncapped billing |
| No surprise bills | No card where possible; budget alert before deploy if a card is on file; cache; limit queries |
| Security | Access control (RLS), injection, secrets, misconfiguration, SSRF; same-origin API = no CORS; CSP headers |
| AI assistants | Own every line; small reviewed steps; distrust "fixes" that disable security; verify pricing claims |
| Scaling | Domain -> Workers Paid -> Supabase Pro -> usage-based; upgrade on evidence |

## Where to go next

- **Build the next features yourself.** Collections UI, tag filtering, full-text search with a Postgres `tsvector` column, and import from your browser's bookmark export. Each one exercises schema design, RLS and the frontend together.
- **Move title fetching to the background.** Save the bookmark immediately, then fetch the title in a queue consumer or a Postgres trigger calling an Edge Function. This is your first taste of asynchronous architecture.
- **Read the primary docs**, which are consistently better than third-party tutorials: Supabase's guides on Row Level Security, API keys and securing the Data API; Cloudflare's Workers docs on static assets, limits and Wrangler configuration; GitHub's docs on Actions, encrypted secrets and branch protection.
- **Study the OWASP Top 10** and the OWASP Cheat Sheet Series, especially the cheat sheets on authentication, authorization and SSRF.
- **Learn SQL properly.** Everything interesting about this app lives in Postgres. Joins, indexes, `explain analyze` and transactions will pay off for the rest of your career.
- **Re-check the free tiers.** Bookmark the pricing pages of every provider you use and revisit them every few months. At the time of writing (2026) the stack above costs nothing; the only way to keep it that way is to notice when that changes.

Ship something small this week. A deployed app with two users teaches you more than a perfect app that never leaves localhost.
