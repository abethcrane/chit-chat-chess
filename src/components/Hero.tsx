export function Hero() {
  return (
    <header className="hero">
      <div>
        <h1 className="hero__title">Chit Chat Chess</h1>
        <p className="hero__tag lede">Chess for people who like the game more than the stress.</p>
        <p className="hero__mascot">
          <span className="wobble" aria-hidden>
            ♘
          </span>{' '}
          unofficial mascot — protect at all costs
        </p>
      </div>
      <img
        className="hero__img"
        src={`${import.meta.env.BASE_URL}premise.png`}
        alt="Meme: not playing chess, playing to win, playing to have fun — the biggest brain is playing for fun"
        width={800}
        height={600}
        decoding="async"
        fetchPriority="high"
      />
    </header>
  );
}
