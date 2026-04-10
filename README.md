# Chit Chat Chess

A safe, silly space to play chess for the fun of it.

This is a little website for hanging out at the board—toggle which pieces are in play, read the house rules, and take turns in the browser like you’re at the same table. Built with React and Vite.

## Run it

You’ll need Node and npm installed.

```bash
npm install
npm run dev
```

(`sync-assets` runs automatically before dev—so images land in the right place; you might see it in the terminal, that’s normal.)

To double-check the production build:

```bash
npm run build
npm run preview
```

## Putting it on the internet?

See [deployment.md](deployment.md) for GitHub Pages, custom domains, and the rest.

## Assets

`npm run sync-assets` (already wired into `dev` and `build`) copies things from `images/` into `public/images/` so the app can use them. If you add art, drop it under `images/` and the sync will pick it up next run. Per-file credits and source URLs live in [`images/attribution.json`](images/attribution.json) (also merged into `public/images/manifest.json` on sync).
