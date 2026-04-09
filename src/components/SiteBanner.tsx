/** Swap for another wide plate (e.g. KMS495.jpg) — banner uses object-fit: contain so the full image shows. */
const BANNER = '2book43.jpg';

export function SiteBanner() {
  const base = import.meta.env.BASE_URL;
  return (
    <div className="site-banner" role="img" aria-label="Decorative vintage chess illustration banner">
      <img
        src={`${base}images/${encodeURIComponent(BANNER)}`}
        alt=""
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
