# Deploying Chit Chat Chess (GitHub Pages + custom domain)

This site is a static Vite build. Production files live in `dist/` after `npm run build`.

## One-time: GitHub Pages + Actions

1. Push this repo to GitHub (default branch `main`, or edit [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) if you use another branch).
2. In the repo on GitHub: **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).
4. Run the workflow once by pushing to `main`, or open **Actions → Deploy to GitHub Pages → Run workflow**.

After the first successful deploy, GitHub shows a default URL like `https://<user>.github.io/<repo>/`.

## Custom domain (recommended)

Production URL: **`https://chitchatchess.club`** (apex domain).

GitHub’s guide: [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

### 1. Add a `CNAME` file to the built site

Vite copies everything from [`public/`](public/) into `dist/`. This repo includes **`public/CNAME`** with the hostname (one line, no `https://`, no trailing slash):

```txt
chitchatchess.club
```

If you ever need to recreate it, copy [`public/CNAME.example`](public/CNAME.example) or create `public/CNAME` manually and commit.

### 2. Tell GitHub the domain

**Settings → Pages → Custom domain** — enter **`chitchatchess.club`**. Save. Enable **Enforce HTTPS** once DNS and certificates are ready.

### 3. DNS at your registrar

This site uses the **apex** `chitchatchess.club`, so use GitHub’s current **A** (and **AAAA** if listed) records from [their docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain) (they can change; always verify there). GitHub Pages settings also shows what they expect.

If you prefer **`www.chitchatchess.club`** instead, put that hostname in `public/CNAME` and GitHub’s custom domain field, then add a **CNAME** for `www` pointing to **`<user>.github.io`** (exact target appears in Pages settings).

Propagation can take a few minutes to 48 hours.

### Troubleshooting: `www.chitchatchess.club` / InvalidDNSError

GitHub still checks **`www`** even when the canonical site is the **apex** (`chitchatchess.club`). If **`www` has no DNS records**, Pages shows *“www.chitchatchess.club is improperly configured”* / *InvalidDNSError*.

**Fix (recommended):** At your registrar (nameservers point to DreamHost), add a **`www`** record:

| Type  | Name / Host | Target / Value        |
| ----- | ----------- | --------------------- |
| CNAME | `www`       | `<your-github-user>.github.io` |

Use the **same** `<user>.github.io` target GitHub shows under **Settings → Pages** for your site (no `https://`, no path). Do **not** change `public/CNAME` or the Pages “Custom domain” field if you want the main URL to stay **`chitchatchess.club`** — only add this `www` CNAME so GitHub’s check passes and `https://www.chitchatchess.club` resolves.

**Verify:** `dig +short www.chitchatchess.club CNAME` should print `<user>.github.io.` after propagation.

**Alternative:** If you do not want `www` at all, set **Custom domain** to **`chitchatchess.club`** only (not `www.…`) and remove any duplicate `www` entry; some UIs still expect a `www` CNAME for HTTPS/certificate flows, so adding the CNAME above is usually simpler.

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
