const ALICE_DIR = 'alice-john-tenniel';
const ALICE_COLOR = `${ALICE_DIR}/alice-awake-queens-color.png`;
const ALICE_BW = `${ALICE_DIR}/alice-sleeping-queens-bw.png`;

export function SiteBanner() {
  const base = import.meta.env.BASE_URL;
  const colorSrc = `${base}images/${ALICE_COLOR}`;
  const bwSrc = `${base}images/${ALICE_BW}`;

  return (
    <div className="site-banner">
      <div
        className="site-banner__hit"
        tabIndex={0}
        role="img"
        aria-label="Alice with the Red and White Queens — hover or focus to see the sleeping woodcut version"
      >
        <div className="site-banner__stage">
          {/* In-flow sizer: hit target matches drawn art, not full viewport width */}
          <img className="site-banner__sizer" src={colorSrc} alt="" aria-hidden draggable={false} />
          <img
            className="site-banner__layer site-banner__layer--bw"
            src={bwSrc}
            alt=""
            decoding="async"
            loading="eager"
            draggable={false}
          />
          <img
            className="site-banner__layer site-banner__layer--color"
            src={colorSrc}
            alt=""
            decoding="async"
            fetchPriority="high"
            loading="eager"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
