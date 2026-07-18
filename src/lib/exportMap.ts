/**
 * Client-side export of the galaxy map SVG to PNG or PDF.
 *
 * The rendered <svg> references tile art by URL (/img/tiles/*.png) and relies
 * on CSS classes for text styling — neither survives serialization, so the
 * export pipeline clones the element, inlines every <image> as a data URI,
 * bakes the text styles in as attributes, rasterizes the result on a canvas
 * and hands the pixels to the requested container (PNG file or a minimal
 * single-page PDF built by hand, no dependencies).
 */

const EXPORT_WIDTH = 2048;
/** Matches the app's --background so labels stay readable. */
const BACKGROUND = '#020617';
/** Breathing room around the outermost hexes, in SVG user units. */
const PADDING = 30;

export type MapExportFormat = 'png' | 'pdf';

export async function exportMapImage(
  svg: SVGSVGElement,
  format: MapExportFormat,
  fileName = 'ti4-map',
): Promise<void> {
  const canvas = await rasterize(svg);
  if (format === 'png') {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Falha ao gerar o PNG.');
    download(blob, `${fileName}.png`);
    return;
  }
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const jpeg = dataUrlToBytes(jpegDataUrl);
  download(jpegToPdf(jpeg, canvas.width, canvas.height), `${fileName}.pdf`);
}

/** Renders the full map (ignoring the current zoom/pan) onto a canvas. */
async function rasterize(svg: SVGSVGElement): Promise<HTMLCanvasElement> {
  // getBBox measures the drawn geometry, so the export always covers the whole
  // map even when the on-screen viewBox is zoomed into a corner.
  const bbox = svg.getBBox();
  const w = bbox.width + PADDING * 2;
  const h = bbox.height + PADDING * 2;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('viewBox', `${bbox.x - PADDING} ${bbox.y - PADDING} ${w} ${h}`);
  clone.removeAttribute('class');
  clone.removeAttribute('style');

  await inlineImages(clone);

  // Text is styled via Tailwind classes on screen; serialize the intent.
  clone.querySelectorAll('text').forEach((t) => {
    t.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
    t.setAttribute('font-weight', '900');
  });

  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_WIDTH;
    canvas.height = Math.round((EXPORT_WIDTH * h) / w);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponível.');
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Replaces every <image href="..."> with a data URI. Browsers refuse to load
 * external resources while rasterizing a standalone SVG, so this is what makes
 * the tile art show up in the export.
 */
async function inlineImages(root: SVGSVGElement): Promise<void> {
  const cache = new Map<string, Promise<string>>();
  const toDataUrl = (href: string) => {
    let p = cache.get(href);
    if (!p) {
      p = fetch(href)
        .then((res) => {
          if (!res.ok) throw new Error(`Falha ao carregar ${href}`);
          return res.blob();
        })
        .then(blobToDataUrl);
      cache.set(href, p);
    }
    return p;
  };

  await Promise.all(
    Array.from(root.querySelectorAll('image')).map(async (img) => {
      const href = img.getAttribute('href') ?? img.getAttribute('xlink:href');
      if (!href || href.startsWith('data:')) return;
      img.setAttribute('href', await toDataUrl(href));
    }),
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao rasterizar o SVG.'));
    img.src = src;
  });
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Wraps a JPEG in a minimal one-page PDF (PDF 1.4, image via DCTDecode).
 * The page keeps the image's aspect ratio at A4-landscape width.
 */
function jpegToPdf(jpeg: Uint8Array, width: number, height: number): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let offset = 0;

  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
    parts.push(bytes);
    offset += bytes.length;
  };
  const beginObj = (n: number) => {
    offsets[n] = offset;
    push(`${n} 0 obj\n`);
  };

  const pageW = 842; // A4 landscape width in points
  const pageH = Math.round((pageW * height) / width);
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;

  push('%PDF-1.4\n');
  beginObj(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  beginObj(2);
  push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  beginObj(3);
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
      '/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
  );
  beginObj(4);
  push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
  beginObj(5);
  push(
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  );
  push(jpeg);
  push('\nendstream\nendobj\n');

  const xrefStart = offset;
  push(
    'xref\n0 6\n0000000000 65535 f \n' +
      [1, 2, 3, 4, 5].map((n) => `${String(offsets[n]).padStart(10, '0')} 00000 n \n`).join(''),
  );
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}
