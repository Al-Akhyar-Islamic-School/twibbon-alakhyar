// Seeds a demo staff user and two sample twibbon frames (real transparent PNGs)
// so Home + the editor are usable without configuring OAuth. Idempotent.
import { PrismaClient } from '@prisma/client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { r2FromEnv } from '../scripts/migrate/_shared.mjs';

// Writes to the database in DATABASE_URL and the bucket in R2_BUCKET. Local
// development only (local MySQL + an S3 emulator via R2_ENDPOINT) — never run
// it against the production TiDB database or R2 bucket.
const prisma = new PrismaClient();
const { client: r2, bucket } = r2FromEnv();

// A ring/frame twibbon: colored border + banner, fully transparent center so
// the user's photo shows through (exactly what a real twibbon PNG looks like).
function frameSvg({ size = 1080, color = '#006195', accent = '#EC2A6B', label = 'AL AKHYAR' }) {
  const b = Math.round(size * 0.06); // border thickness
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <mask id="hole">
        <rect width="${size}" height="${size}" fill="white"/>
        <rect x="${b}" y="${b}" width="${size - 2 * b}" height="${size - 2 * b - size * 0.14}" rx="${size * 0.05}" fill="black"/>
      </mask>
    </defs>
    <rect width="${size}" height="${size}" fill="${color}" mask="url(#hole)"/>
    <rect x="0" y="${size - size * 0.14}" width="${size}" height="${size * 0.14}" fill="${accent}"/>
    <text x="50%" y="${size - size * 0.05}" text-anchor="middle" font-family="Poppins, sans-serif"
      font-size="${size * 0.06}" font-weight="700" fill="#ffffff" letter-spacing="2">${label}</text>
  </svg>`;
}

async function makeTwibbon(opts) {
  const buffer = await sharp(Buffer.from(frameSvg(opts))).png().toBuffer();
  const key = `${randomUUID()}.png`;
  await r2.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: 'image/png' })
  );
  const meta = await sharp(buffer).metadata();
  return { key, width: meta.width, height: meta.height, size: buffer.length };
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@alakhyar.sch.id' },
    update: {},
    create: { email: 'demo@alakhyar.sch.id', name: 'Demo Staff', role: 'admin' },
  });

  const existing = await prisma.twibbon.count();
  if (existing > 0) {
    console.log(`Seed skipped — ${existing} twibbon(s) already exist.`);
    return;
  }

  const samples = [
    { title: 'Townhall Al Akhyar 2026', label: 'TOWNHALL 2026', color: '#006195', accent: '#EC2A6B' },
    { title: 'PPDB Tahun Ajaran Baru', label: 'PPDB 2026/2027', color: '#29ABE2', accent: '#006195' },
    { title: 'Milad ke-10 Yayasan', label: 'MILAD KE-10', color: '#2FA97B', accent: '#F5A623' },
  ];

  for (const s of samples) {
    const f = await makeTwibbon({ label: s.label, color: s.color, accent: s.accent });
    await prisma.twibbon.create({
      data: {
        title: s.title,
        description: 'Contoh twibbon (seed).',
        imageKey: f.key,
        width: f.width,
        height: f.height,
        fileSize: f.size,
        isActive: true,
        createdById: user.id,
      },
    });
    console.log('Seeded twibbon:', s.title);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
