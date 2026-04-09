export function Hero() {
  const base = import.meta.env.BASE_URL;
  return (
    <header className="hero">
      <div>
        <h1 className="hero__title">Chit Chat Chess</h1>
        <p className="hero__tag lede">Let’s have a nice time together. Also: chess.</p>
        <p className="hero__mascot">
          Safe, silly, cooperative games for people who know the rules (or want a gentle intro).
        </p>
      </div>
      <img
        className="hero__img"
        src={`${base}premise.png`}
        alt="Meme: not playing chess, playing to win, playing to have fun — the biggest brain is playing for fun"
        width={800}
        height={600}
        decoding="async"
        fetchPriority="high"
      />
    </header>
  );
}
