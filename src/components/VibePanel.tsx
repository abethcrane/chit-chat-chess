const VIBE_IMAGES = [
  {
    file: '1576d749-d444-4399-8f38-b71931dd6c77_3000.jpg',
    caption: 'Women at the board — quiet focus, big sleeves, no pressure to be brilliant.',
  },
  {
    file: 'KMS495.jpg',
    caption: 'Chess outdoors, in color: conversation, coffee, and sunlight on the pieces.',
  },
] as const;

export function VibePanel() {
  const base = import.meta.env.BASE_URL;
  return (
    <section className="vibe-panel" aria-labelledby="vibe-heading">
      <h2 id="vibe-heading" className="section-title vibe-panel__title">
        The vibe we mean
      </h2>
      <p className="section-lede vibe-panel__lede">
        Not a museum wall — just two moods: thoughtful parlor energy, and “we’re outside, it’s pretty,
        who cares who’s up a pawn.”
      </p>
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
