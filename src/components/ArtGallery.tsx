import { useEffect, useState } from 'react';

type Manifest = { files: string[] };

type ArtworkMeta = {
  title?: string;
  artist?: string;
  year?: string;
  credit?: string;
  sourceUrl?: string;
};

type ArtworksFile = Record<string, ArtworkMeta>;

function encodePath(seg: string) {
  return seg.split('/').map(encodeURIComponent).join('/');
}

export function ArtGallery() {
  const [files, setFiles] = useState<string[]>([]);
  const [meta, setMeta] = useState<ArtworksFile>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    let cancelled = false;
    (async () => {
      try {
        const manRes = await fetch(`${base}images/manifest.json`);
        if (!manRes.ok) throw new Error('No image manifest');
        const man: Manifest = await manRes.json();
        const artRes = await fetch(`${base}images/artworks.json`);
        const art: ArtworksFile = artRes.ok ? await artRes.json() : {};
        if (!cancelled) {
          setFiles(man.files ?? []);
          setMeta(art);
        }
      } catch {
        if (!cancelled) {
          setErr('Could not load gallery manifest.');
          setFiles([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err || files.length === 0) {
    return (
      <section className="gallery" aria-labelledby="gallery-heading">
        <h2 id="gallery-heading" className="section-title">
          Chess in the wild (public domain)
        </h2>
        <p className="section-lede">
          {err ?? 'Add images under images/ and run npm run dev — they sync into public/images.'}
        </p>
      </section>
    );
  }

  const base = import.meta.env.BASE_URL;

  return (
    <section className="gallery" aria-labelledby="gallery-heading">
      <h2 id="gallery-heading" className="section-title">
        Chess in the wild (public domain)
      </h2>
      <p className="section-lede">
        A few pieces from our stash. Fill in <code>public/images/artworks.json</code> for proper
        captions.
      </p>
      <div className="gallery-grid">
        {files.map((name) => {
          const m = meta[name];
          const caption =
            m?.title && m?.artist
              ? `${m.title} — ${m.artist}${m.year ? ` (${m.year})` : ''}`
              : m?.title ?? m?.artist ?? name.replace(/\.[^.]+$/, '');
          const src = `${base}images/${encodePath(name)}`;
          return (
            <figure key={name}>
              <img src={src} alt={m?.title ? `${m.title}${m?.artist ? `, ${m.artist}` : ''}` : caption} loading="lazy" decoding="async" />
              <figcaption>{caption}</figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
