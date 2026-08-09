# Jed556 - Portfolio / Showcase (React + TypeScript + Vite)

This branch is a personal portfolio and projects site built with React, TypeScript, and Vite. It contains the main app (located in `src/`), a few local packages used for WebGL/Three.js utilities, and a reference site copy for legacy assets.

## What this is
- A modern portfolio front-end using React 19, Vite, and TypeScript.
- Heavy use of Three.js and `@react-three/fiber` for WebGL scenes and immersive background effects.
- Local packages in `packages/` contain reusable Three.js helpers used by the site.

## Quick start
1. Install dependencies:

  ```
  npm install
  ```

2. Run the development server (Vite + HMR):

  ```
  npm run dev
  ```

3. Build for production:

  ```
  npm run build
  ```

4. Preview a production build locally:

  ```
  npm run preview
  ```

Available npm scripts are declared in `package.json` (`dev`, `build`, `preview`, `lint`).

## Project structure (important files/folders)
- `src/` — application source: components, pages, assets, hooks, and utils. The React entry is `main.tsx` / `App.tsx`.
- `public/` — static assets (fonts, icons, project screenshots used by the site).
- `packages/` — local packages (e.g., `ore-three`, `power-mesh`) that provide Three.js utilities and are consumed by the main app.
- `reference_next.junni.co.jp/` — an archived/legacy reference site and build tooling (gulp/webpack) kept for reference.
- `vite.config.ts`, `tsconfig*.json` — build and TypeScript configuration.

## Notable implementation details
- Uses `@react-three/fiber`, `@react-three/drei`, and `postprocessing` for 3D rendering and effects.
- Framer Motion is used for UI transitions and micro-interactions.
- `sharp` is included as a dependency for image processing in build pipelines (if used).

## Development notes
- Lint with `npm run lint` (oxlint is configured; consider enabling type-aware rules for stricter checks).
- TypeScript project references are used; the `build` script runs `tsc -b` before `vite build`.

## Where to look for things
- Homepage and routes: `src/pages/` (e.g., `Home.tsx`, `Projects.tsx`, `Contact.tsx`).
- Shared UI: `src/components/ui/` and `src/components/layout/`.
- WebGL backgrounds: `src/components/background/` and `packages/` for lower-level helpers.

## Contributing / Extending
- Add or update content in `src/pages` and `src/components`.
- If you add native node scripts that depend on `sharp` or other native libs, run a fresh `npm install` and rebuild.
