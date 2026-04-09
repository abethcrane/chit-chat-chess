export async function makePixelCursorDataUrl(
  imageUrl: string,
  opts: { size: number; pad: number } = { size: 32, pad: 2 },
): Promise<string | null> {
  const img = new Image();
  img.decoding = 'async';

  const loaded: boolean = await new Promise((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = imageUrl;
  });

  if (!loaded || img.naturalWidth <= 0) return null;

  const { size, pad } = opts;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  // Fit inside with padding, preserve aspect ratio.
  const avail = size - pad * 2;
  const ar = img.naturalWidth / img.naturalHeight || 1;
  let w = avail;
  let h = Math.round(avail / ar);
  if (h > avail) {
    h = avail;
    w = Math.round(avail * ar);
  }
  const x = Math.floor((size - w) / 2);
  const y = Math.floor((size - h) / 2);
  ctx.drawImage(img, x, y, w, h);

  return c.toDataURL('image/png');
}

