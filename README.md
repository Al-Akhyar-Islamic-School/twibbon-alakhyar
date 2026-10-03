# Twibbon Al Akhyar

PWA pembuat twibbon resmi Yayasan Al Akhyar — `twibbon.alakhyar.sch.id`.

Pengunjung (tanpa login) memilih twibbon aktif, memasang fotonya, lalu mengunduh
hasilnya. Seluruh proses penggabungan foto terjadi **di browser** — foto
pengguna tidak pernah diunggah ke server. Staff dengan email `@*.alakhyar.sch.id`
dapat login untuk mengunggah & mengelola twibbon.

Dibangun dengan **Next.js (App Router)** + **Prisma** dan mengikuti **Al Akhyar
Design System** agar konsisten dengan ekosistem `*.alakhyar.sch.id` (Dinar dll).

## Stack

| Bagian | Teknologi |
|---|---|
| Frontend / PWA | Next.js 14 (App Router), service worker manual (`public/sw.js`) |
| Compositing | HTML5 Canvas API native (pan / pinch-zoom / cover clamp), tanpa library berat |
| Auth | Auth.js (NextAuth v5) — Google OAuth, dibatasi domain `*.alakhyar.sch.id` |
| API | Next.js Route Handlers |
| Hosting | **Netlify** (team sekolah), scheduled function untuk cleanup harian |
| Database | Prisma + **TiDB Cloud Starter** (kompatibel MySQL) |
| Storage | **Cloudflare R2** (S3 API) — upload langsung dari browser via presigned URL, disajikan lewat `/file/<key>` + cache CDN |
| Desain | Al Akhyar Design System (`src/ds/`) |

## Menjalankan (Local Dev)

Prasyarat: Node 22, akses ke DB `twibbon_staging` (TiDB) dan bucket R2
`twibbon-alakhyar-staging` (CORS mengizinkan `http://localhost:3000`).
Jangan arahkan dev lokal ke DB/bucket produksi.

```bash
npm install
cp .env.example .env       # isi DATABASE_URL (staging), R2_* (staging), Google OAuth
npm run db:push            # buat/selaraskan tabel
npm run icons              # generate ikon PWA dari logo Alif
npm run db:seed            # (opsional) 3 twibbon contoh ke DB + bucket staging
npm run dev                # http://localhost:3000
```

Deploy (Netlify + TiDB + R2), runbook migrasi dari VPS, dan rollback:
lihat **[DEPLOY.md](DEPLOY.md)**.

Alur **guest** (pilih twibbon → pasang foto → unduh) cukup butuh DB dan R2.
**Login & upload** juga butuh Google OAuth (lihat di bawah).

## Konfigurasi Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com) → **Credentials** →
   *Create OAuth client ID* → **Web application**.
2. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://twibbon.alakhyar.sch.id/api/auth/callback/google` (prod)
3. Isi `.env`:
   ```
   AUTH_GOOGLE_ID=...
   AUTH_GOOGLE_SECRET=...
   AUTH_SECRET=$(openssl rand -base64 32)
   ALLOWED_EMAIL_DOMAIN=alakhyar.sch.id
   ```

Pembatasan domain **tidak** hanya mengandalkan parameter `hd` Google (yang hanya
cocok satu domain persis). Callback `signIn` di [`src/lib/auth.ts`](src/lib/auth.ts)
memvalidasi email berakhiran `alakhyar.sch.id` **atau subdomainnya**
(`sd.`, `smp.`, `sma.`…) — lihat [`src/lib/domain.ts`](src/lib/domain.ts).

## Struktur

```
src/
  app/
    page.tsx                    Home — grid twibbon aktif
    editor/[id]/page.tsx        Editor guest (+ Open Graph per twibbon)
    login/                      Login Google (server action)
    dashboard/page.tsx          Dashboard staff (auth-gated)
    api/twibbons/               CRUD + scope=public|mine, download log
    api/auth/[...nextauth]/     Handler Auth.js
    api/uploads/sign/           Presigned URL upload langsung ke R2
    api/cron/cleanup/           Hapus file twibbon kedaluwarsa (dipanggil cron)
    file/[key]/route.ts         Penyajian PNG dari R2 (stream + cache CDN immutable)
  components/
    TwibbonEditor.tsx           Mesin compositing canvas (inti aplikasi)
    DashboardClient.tsx         Upload / edit / toggle / hapus
    SiteHeader.tsx, TwibbonCard.tsx, ServiceWorkerRegister.tsx
  lib/
    auth.ts domain.ts db.ts storage.ts (R2) uploads.ts cdn.ts limits.ts
    validateTwibbon.ts twibbon.ts format.ts freeze.ts
  ds/                           Al Akhyar Design System (token + komponen)
prisma/schema.prisma            Model User, Twibbon, DownloadLog
public/                         manifest, sw.js, ikon, aset brand
```

## Peta PRD → Implementasi

| PRD | Di mana |
|---|---|
| FR-01 tampil hanya aktif & dalam rentang tanggal | `lib/twibbon.ts#isPubliclyVisible` |
| FR-02 editor tanpa login | `app/editor/[id]` (publik) |
| FR-03 input galeri/kamera | `<input accept="image/*">` di `TwibbonEditor` |
| FR-04 pan + zoom, cover behavior | `TwibbonEditor` (`clampTransform`, pinch/wheel/slider) |
| FR-05 twibbon layer statis | hanya foto interaktif; twibbon digambar tetap |
| FR-06 opacity turun saat edit, 100% saat preview | `EDIT_ALPHA`, tombol Pratinjau |
| FR-07 kanvas = dimensi asli PNG | `canvas width/height = twibbon.width/height` |
| FR-08 unduh PNG resolusi asli | `renderFinalBlob` → `toBlob('image/png')` |
| FR-09 login domain `*.alakhyar.sch.id` | `lib/domain.ts` + `signIn` callback |
| FR-10/11 upload PNG + validasi transparansi | `api/uploads/sign` → PUT ke R2 → `api/twibbons` POST + `lib/uploads.ts` / `validateTwibbon.ts` (sniff magic byte + alpha) |
| FR-12 toggle aktif/nonaktif | Dashboard toggle → PATCH |
| FR-13 edit/hapus (soft delete) | PATCH / DELETE `api/twibbons/[id]` |
| FR-14 Web Share API | tombol Bagikan (`navigator.share`) |
| FR-15 statistik unduhan | `DownloadLog` + `api/twibbons/[id]/download` |
| FR-16/17 PWA installable + offline home | `manifest.webmanifest`, `public/sw.js` |
| §10 Design System | `src/ds/` (token + komponen dipakai apa adanya) |

## Menuju Produksi (checklist)

- [ ] Setup R2 (bucket, CORS, lifecycle, token bucket-scoped), TiDB, dan Netlify sesuai [DEPLOY.md](DEPLOY.md) §1.
- [ ] Set env per deploy context di Netlify; aktifkan auto-recharge + usage alert.
- [ ] Jalankan workflow `db-backup` sekali dan uji restore.
- [ ] Migrasi data dari VPS dengan skrip `migrate:*` (DEPLOY.md §3).
- [ ] Keputusan bisnis terbuka (PRD §12): role upload (Opsi A/B), moderasi,
      orientasi non-persegi. Kolom `role` sudah tersedia untuk Opsi B.

## Catatan Keputusan Desain

- **Tanpa library canvas berat** (Konva/Fabric). Interaksi pan/pinch/cover-clamp
  ringkas ditulis langsung di Canvas API → bundle kecil, cepat di HP.
- **Cover behavior**: skala minimum = skala penutup penuh; posisi foto selalu
  di-clamp sehingga kanvas tidak pernah berlubang (`clampTransform`).
- **Output = resolusi asli twibbon**: backing store canvas = dimensi asli PNG,
  hanya diperkecil via CSS untuk tampilan.
- **Soft delete**: baris twibbon tidak dihapus permanen (statistik unduhan tetap
  utuh); file PNG-nya langsung dihapus dari R2 agar storage tidak menumpuk.
- **Upload tidak lewat function**: browser mengunggah langsung ke R2 dengan
  presigned URL, lalu server memvalidasi dan memindahkan file. Batas body
  serverless (~4,5 MB) tidak berlaku, jadi batas 5 MB tetap bisa dipakai.
- **File tetap same-origin** (`/file/<key>`): URL lama dan preview OG tidak berubah,
  dan canvas editor tidak butuh CORS.
