import artAttribution from '../../images/attribution.json';

type ArtAttr = { credit: string; sourceLabel: string; sourceUrl: string };

const VIBE_IMAGES = [
  {
    file: 'women-in-parlour.png',
    caption: 'Ask us about Grand Vizier chess (we have *ideas*).',
  },
  {
    file: 'men-playing-outside.jpg',
    caption: "When it's this nice outside who cares if none of your clever traps are working out?",
  },
] as const;

function attributionFor(file: string): ArtAttr | undefined {
  const row = (artAttribution as Record<string, ArtAttr>)[file];
  return row?.sourceUrl ? row : undefined;
}

export function VibePanel() {
  const base = import.meta.env.BASE_URL;
  return (
    <section className="vibe-panel" aria-labelledby="vibe-heading">
      <h2 id="vibe-heading" className="section-title vibe-panel__title">
        The vibe we mean
      </h2>
      <div className="vibe-panel__grid">
        {VIBE_IMAGES.map(({ file, caption }) => {
          const attr = attributionFor(file);
          return (
            <figure key={file} className="vibe-panel__figure">
              <div className="vibe-panel__frame">
                <img
                  src={`${base}images/${encodeURIComponent(file)}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <figcaption>
                <div className="vibe-panel__caption">{caption}</div>
                {attr ? (
                  <div className="vibe-panel__attribution">
                    {attr.credit}
                    {' · '}
                    <a href={attr.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {attr.sourceLabel}
                    </a>
                  </div>
                ) : null}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
