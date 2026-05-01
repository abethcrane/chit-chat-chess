export function Hero() {
  const base = import.meta.env.BASE_URL;
  return (
    <header className="hero">
      <div>
        <h1 className="hero__title">Chit Chat Chess</h1>
        <p className="hero__tag lede">What if we had a nice time...<br /><br />...and also...<br/><br/>...played chess 👉👈</p>
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
