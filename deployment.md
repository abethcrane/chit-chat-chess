# Deploying Chit Chat Chess (GitHub Pages + custom domain)

This site is a static Vite build. Production files live in `dist/` after `npm run build`.

## One-time: GitHub Pages + Actions

1. Push this repo to GitHub (default branch `main`, or edit [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) if you use another branch).
2. In the repo on GitHub: **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).
4. Run the workflow once by pushing to `main`, or open **Actions → Deploy to GitHub Pages → Run workflow**.

After the first successful deploy, GitHub shows a default URL like `https://<user>.github.io/<repo>/`.

## Custom domain (recommended)

GitHub’s guide: [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

### 1. Add a `CNAME` file to the built site

Vite copies everything from [`public/`](public/) into `dist/`. Put your hostname in **`public/CNAME`** (one line, no `https://`, no trailing slash):

```txt
www.example.com
```

Use either `www.example.com` or the apex `example.com`, depending on what you want in the browser bar. Commit and push this file.

There is a [`public/CNAME.example`](public/CNAME.example) you can copy:

```bash
cp public/CNAME.example public/CNAME
# edit public/CNAME to your real hostname
```

### 2. Tell GitHub the domain

**Settings → Pages → Custom domain** — enter the same hostname (`www.example.com` or `example.com`). Save. Enable **Enforce HTTPS** once DNS and certificates are ready.

### 3. DNS at your registrar

- **Subdomain** (e.g. `www.example.com`): create a **CNAME** record pointing to **`<user>.github.io`** (GitHub shows the exact target in the Pages settings).
- **Apex** (`example.com`): use GitHub’s current **A** records from [their docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain) (they can change; always verify there).

Propagation can take a few minutes to 48 hours.

### 4. Vite `base` URL

With a **custom domain**, the site is served at the **root** of that domain, so keep the default:

- `vite.config.ts` uses `base: '/'` when `VITE_BASE` is unset.

If you **do not** use a custom domain and only use **`https://<user>.github.io/<repo>/`**, you must set the base path to your repository name:

- **Option A (CI):** In the repo, **Settings → Secrets and variables → Actions → Variables** → add variable `VITE_BASE` with value `/your-repo-name/` (leading and trailing slashes as in [`vite.config.ts`](vite.config.ts)).
- **Option B (local):** `VITE_BASE=/your-repo-name/ npm run build`

## Workflow file

[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) runs `npm ci` and `npm run build`, then uploads `dist/` with `actions/upload-pages-artifact` and deploys with `actions/deploy-pages`.

It passes **`VITE_BASE`** from a **repository variable** of the same name (see GitHub **Settings → Secrets and variables → Actions → Variables**). For a **custom domain**, leave that variable **undefined** so the build uses `base: '/'`. For the default **`https://<user>.github.io/<repo>/`** URL only, set `VITE_BASE` to `/repo-name/`.

## Local checks

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Assets

`npm run sync-assets` (runs automatically before `dev` / `build`) copies `images/` → `public/images/` and `premise.png` → `public/premise.png`. Curated banner/vibe filenames live in [`src/components/SiteBanner.tsx`](src/components/SiteBanner.tsx) and [`src/components/VibePanel.tsx`](src/components/VibePanel.tsx); add `white-knight.png` / `black-knight.png` under `images/` for the draggable knight.

## Optional: large PDF in git

`Chess_Its_Poetry_and_Its_Prose.pdf` is not required for the live site. If the repo gets heavy, add it to `.gitignore` and keep it locally, or use [Git LFS](https://git-lfs.com/).
