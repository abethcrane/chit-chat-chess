const VIBE_IMAGES = [
  {
    file: 'women-in-parlour.png',
    caption: 'Ask us about Grand Vizier chess (we have *ideas*).',
  },
  {
    file: 'KMS495.jpg',
    caption: "When it's this nice outside who cares if none of your clever traps are working out?",
  },
] as const;

export function VibePanel() {
  const base = import.meta.env.BASE_URL;
  return (
    <section className="vibe-panel" aria-labelledby="vibe-heading">
      <h2 id="vibe-heading" className="section-title vibe-panel__title">
        The vibe we mean
      </h2>
      <div className="vibe-panel__grid">
        {VIBE_IMAGES.map(({ file, caption }) => (
          <figure key={file} className="vibe-panel__figure">
            <div className="vibe-panel__frame">
              <img
                src={`${base}images/${encodeURIComponent(file)}`}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption>{caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
