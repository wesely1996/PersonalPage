# PersonalPage

Personal portfolio built with Angular to showcase both backend craftsmanship and frontend range. Includes project highlights, interactive media lists, and a polished landing experience.

## Highlights

- Single-page Angular 19 app with standalone components and route-based sections (home, projects, blog-like articles, media libraries).
- Content flexibility: renders Markdown articles (`ngx-markdown`), CSV-driven tables (`papaparse`), and PDF previews for the CV (`ng2-pdf-viewer`).
- Responsive layout with SCSS, Angular CDK, and reusable UI primitives (navigation bar, shortcut buttons, terminal-style dialogs, background effects, preloaders).
- PWA-ready setup via `@angular/service-worker` and `public/manifest.webmanifest` for offline-friendly builds.
- Deployed to GitHub Pages with `angular-cli-ghpages`; configured base href for the hosted path.

## Tech Stack

- Framework: Angular 19 (standalone), TypeScript, RxJS, Angular Router, Angular Service Worker.
- UI: Angular CDK, custom SCSS styles, component-scoped styling.
- Content handling: `ngx-markdown`, `marked`, `ng2-pdf-viewer`, `papaparse`, `date-fns` utilities.
- Tooling: Angular CLI, Karma/Jasmine for unit tests, `angular-cli-ghpages` for publishing.

## Project Structure

- `src/app` - feature components, services, routing, and app config (standalone pattern).
- `src/styles.scss` - global styling; component SCSS files live next to their templates.
- `public/` - static assets, icons, and `manifest.webmanifest` for PWA metadata.
- `src/app/app.routes.ts` - route definitions; `app.config.ts` - global providers and service worker setup.
- Tests live alongside sources as `*.spec.ts`.

## Getting Started

```bash
npm install
npm start
# then visit http://localhost:4200/
```

## Scripts

- `npm start` - Run dev server with HMR.
- `npm run watch` - Incremental build in development mode.
- `npm run build` - Production build to `dist/personal-page/`.
- `npm run build-prod` - Production build and deploy to GitHub Pages.
- `npm test` - Run unit tests with Karma/Jasmine.

## Development Notes

- Prefer strongly typed APIs; avoid `any`. Use standalone components and keep templates focused.
- Co-locate tests and styles with their components; extract presentational pieces as templates grow.
- Review `ngsw-config.json` and `public/` assets if adjusting PWA or asset paths.

## What This Demonstrates

- Frontend architecture with Angular standalone components and modular routing.
- Data-driven UI (Markdown, CSV ingestion, PDF rendering) without a backend.
- Build/deploy automation for static hosting and PWA readiness.
- Testing discipline with Karma/Jasmine to validate UI logic.
