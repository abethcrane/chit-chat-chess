const ALICE_COLOR = 'alice-awake-queens-color.png';
const ALICE_BW = 'alice-sleeping-queens-bw.png';

export function SiteBanner() {
  const base = import.meta.env.BASE_URL;
  return (
    <div
      className="site-banner"
      tabIndex={0}
      role="img"
      aria-label="Alice with the Red and White Queens — hover or focus to see the sleeping woodcut version"
    >
      <div className="site-banner__stage">
        <img
          className="site-banner__layer site-banner__layer--bw"
          src={`${base}images/${ALICE_BW}`}
          alt=""
          decoding="async"
          loading="eager"
        />
        <img
          className="site-banner__layer site-banner__layer--color"
          src={`${base}images/${ALICE_COLOR}`}
          alt=""
          decoding="async"
          fetchPriority="high"
          loading="eager"
        />
      </div>
    </div>
  );
}
