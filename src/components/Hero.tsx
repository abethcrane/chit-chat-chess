export function Hero() {
  const base = import.meta.env.BASE_URL;
  return (
    <header className="hero">
      <div>
        <h1 className="hero__title">Chit Chat Chess</h1>
        <p className="hero__tag lede">Soft focus. Big feelings. Small stakes.</p>
        <p className="hero__mascot">
          <img
            className="hero__knight-thumb"
            src={`${base}images/white-knight.png`}
            width={40}
            height={40}
            alt=""
            decoding="async"
          />{' '}
          Kevin says hi — unofficial mascot, official drama queen
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
