// Generate PWA icons + apple-touch icon from the Alif brand mark,
// centered on the brand-blue background as a maskable icon.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'public', 'brand', 'logo-yayasan-white.png');
const outDir = join(root, 'public', 'icons');

const BRAND = { r: 0, g: 97, b: 149, alpha: 1 }; // #006195

async function makeIcon(size, { padding = 0.2, maskable = false } = {}) {
  const inner = Math.round(size * (1 - padding * 2));
  const logo = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const bg = maskable
    ? { r: 0, g: 97, b: 149, alpha: 1 }
    : { r: 0, g: 97, b: 149, alpha: 1 };
  return sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const targets = [
    { name: 'icon-192.png', size: 192, padding: 0.18 },
    { name: 'icon-512.png', size: 512, padding: 0.18 },
    { name: 'icon-maskable-512.png', size: 512, padding: 0.24, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, padding: 0.16 },
  ];
  for (const t of targets) {
    const buf = await makeIcon(t.size, { padding: t.padding, maskable: t.maskable });
    await sharp(buf).toFile(join(outDir, t.name));
    console.log('generated', t.name);
  }
  // favicon
  const fav = await makeIcon(64, { padding: 0.14 });
  await sharp(fav).toFile(join(root, 'public', 'favicon.png'));
  console.log('generated favicon.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
