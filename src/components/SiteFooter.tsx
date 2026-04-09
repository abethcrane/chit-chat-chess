export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>
        Gallery images are public domain; see <code>public/images/artworks.json</code> for credits
        you add.
      </p>
      <p>
        Built with love, Pretext, and excessive regard for knights.{' '}
        <a href="https://github.com/LeoBluuee/OpenChessLibrary" target="_blank" rel="noreferrer">
          Open Chess Library
        </a>{' '}
        is a nice rabbit hole.
      </p>
    </footer>
  );
}
