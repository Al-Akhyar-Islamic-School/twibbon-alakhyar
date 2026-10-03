# Deploy — Twibbon Al Akhyar (Netlify + TiDB + Cloudflare R2)

| Komponen | Layanan | Catatan |
|---|---|---|
| App (Next.js 14) | **Netlify**, team Personal sekolah | Function berjalan di `cmh` (Ohio). Deploy otomatis dari branch `main`. |
| Database | **TiDB Cloud Starter**, AWS `us-east-1` | Kompatibel MySQL; Prisma `provider = "mysql"`. |
| File PNG | **Cloudflare R2**, bucket `twibbon-alakhyar` | Dilayani lewat `/file/<key>` (same-origin) dan di-cache durable di CDN Netlify. |
| Cron | Netlify Scheduled Function `cleanup-cron` | Setiap hari 02:00 WIB → `POST /api/cron/cleanup`. |
| Backup DB | GitHub Actions `db-backup` | Mingguan, terenkripsi, retensi 90 hari. |
| DNS | Hostinger | `twibbon` → CNAME `<site>.netlify.app` |

Alur upload: browser → `POST /api/uploads/sign` → `PUT` langsung ke R2 (`pending/<uuid>.png`) → `POST/PATCH /api/twibbons` (JSON + `pendingKey`). Server memvalidasi file dengan `sharp`, lalu memindahkannya ke `<uuid>.png`. File tidak pernah melewati function, sehingga batas body Netlify (~4,5 MB efektif) tidak berlaku. Batas upload tetap 5 MB.

---

## 1. Setup sekali

### 1.1 Cloudflare R2 (akun yang sama dengan Dinar eRapor)
1. Buat bucket **`twibbon-alakhyar`** dan **`twibbon-alakhyar-staging`** (location hint: *Eastern North America*).
2. **CORS** untuk masing-masing bucket (Settings → CORS policy):
   ```json
   [
     {
       "AllowedOrigins": [
         "https://twibbon.alakhyar.sch.id",
         "https://<site>.netlify.app",
         "https://staging--<site>.netlify.app"
       ],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   Di bucket staging, tambahkan `"http://localhost:3000"` untuk dev lokal.
3. **Object lifecycle** (masing-masing bucket): hapus objek dengan prefix `pending/` setelah **1 hari**.
4. **API token**: R2 → *Manage API tokens* → *Object Read & Write*, **dibatasi ke dua bucket twibbon saja**. Jangan pakai token eRapor atau token akun-wide. Catat Account ID, Access Key ID, dan Secret.
5. Uji isolasi: token ini **harus ditolak** saat mengakses bucket eRapor.

### 1.2 TiDB Cloud Starter
1. Buat instance di **AWS us-east-1**.
2. Buat database `twibbon` (produksi) dan `twibbon_staging`.
3. *Connect* → Prisma → salin URL: `mysql://<prefix>.root:<pass>@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/<db>?sslaccept=strict`. Tambahkan `&connection_limit=3`.
4. Buat skema dari laptop:
   ```bash
   DATABASE_URL='<url twibbon_staging>' npx prisma db push
   DATABASE_URL='<url twibbon>' npx prisma db push
   ```

### 1.3 Netlify
1. *Add new project* → impor repo `Al-Akhyar-Islamic-School/twibbon-alakhyar` ke team sekolah. Build settings dibaca dari `netlify.toml`.
2. *Branches and deploy contexts*: production branch `main`, aktifkan **branch deploy untuk `staging`**.
3. **Team Owner**: aktifkan **auto-recharge** dan **usage alert**. Kalau credit habis, *semua* situs di team di-pause.
4. Environment variables (scope Builds + Functions, tandai sebagai secret):

| Variabel | Production | Branch deploy / Deploy Preview |
|---|---|---|
| `DATABASE_URL` | TiDB `twibbon` | TiDB `twibbon_staging` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | token bucket-scoped | sama |
| `R2_BUCKET` | `twibbon-alakhyar` | `twibbon-alakhyar-staging` |
| `AUTH_SECRET` | **sama dengan VPS** selama migrasi | acak sendiri |
| `AUTH_TRUST_HOST` | `true` | `true` |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | OAuth client yang sama | sama |
| `ALLOWED_EMAIL_DOMAIN` | `alakhyar.sch.id` | sama |
| `NEXT_PUBLIC_SITE_URL` | `https://twibbon.alakhyar.sch.id` | `https://staging--<site>.netlify.app` |
| `CRON_SECRET` | `openssl rand -hex 32` | nilai lain |

`AUTH_URL` **tidak di-set**. `trustHost: true` di `src/lib/auth.ts` membuat Auth.js memakai host dari header Netlify, jadi build yang sama berjalan di `<site>.netlify.app` dan di domain custom.

### 1.4 Google Cloud Console (OAuth client twibbon)
Authorized redirect URI:
- `https://twibbon.alakhyar.sch.id/api/auth/callback/google` (sudah ada, tidak berubah)
- `https://<site>.netlify.app/api/auth/callback/google` (sementara, untuk uji sebelum cutover)
- `https://staging--<site>.netlify.app/api/auth/callback/google`

URL Deploy Preview acak dan Google tidak menerima wildcard, jadi login hanya bisa diuji di branch `staging`.

### 1.5 GitHub Actions secrets (untuk `db-backup`)
`TIDB_HOST`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE` (= `twibbon`), `BACKUP_PASSPHRASE` (simpan juga di pengelola password sekolah; tanpa passphrase ini backup tidak bisa dibuka).

Setelah itu jalankan workflow sekali secara manual (*Actions → db-backup → Run workflow*), lalu **uji restore** ke `twibbon_staging`.

---

## 2. Deploy sehari-hari
- `git push` ke `main` → production deploy otomatis (15 credit per deploy).
- `git push` ke `staging` → branch deploy gratis memakai DB dan bucket staging.
- Perubahan skema: jalankan `DATABASE_URL=… npx prisma db push` ke staging dulu, baru ke produksi, **sebelum** merge.

---

## 3. Runbook migrasi dari VPS

> Semua perintah di VPS dijalankan sebagai user **`alakhyar-twibbon`**, bukan root (`su - alakhyar-twibbon`).

### 3.1 Persiapan
- Branch `feat/freeze-flag` sudah di-merge dan di-deploy di VPS. Tag commit itu dengan `git tag vps-final && git push origin vps-final`. **Setelah itu VPS tidak di-`git pull` lagi.**
- Pre-check di VPS:
  ```bash
  cd ~/htdocs/twibbon.alakhyar.sch.id
  mysql -u twibbon-user -p twibbon-alakhyar -e "SELECT 'User',COUNT(*) FROM User UNION ALL SELECT 'Twibbon',COUNT(*) FROM Twibbon UNION ALL SELECT 'DownloadLog',COUNT(*) FROM DownloadLog"
  ls -lS storage | head
  (cd storage && sha256sum *.png) > ~/twibbon-files.sha256
  ```

### 3.2 Salin data (rehearsal, lalu diulang saat sinkronisasi akhir)
```bash
# di VPS: dump DATA SAJA (skema dibuat Prisma di TiDB)
mysqldump -u twibbon-user -p --no-create-info --complete-insert --single-transaction \
  --no-tablespaces --skip-triggers twibbon-alakhyar User Twibbon DownloadLog > ~/twibbon-data.sql

# di laptop
scp alakhyar-twibbon@<vps>:~/twibbon-data.sql alakhyar-twibbon@<vps>:~/twibbon-files.sha256 .
scp -r alakhyar-twibbon@<vps>:~/htdocs/twibbon.alakhyar.sch.id/storage ./vps-storage
(cd vps-storage && sha256sum -c ../twibbon-files.sha256)

mysql --ssl-mode=VERIFY_IDENTITY -h gateway01.us-east-1.prod.aws.tidbcloud.com -P 4000 \
  -u '<prefix>.root' -p twibbon < twibbon-data.sql

R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… R2_BUCKET=twibbon-alakhyar \
  npm run migrate:upload-r2 -- ./vps-storage ./twibbon-files.sha256
```

### 3.3 Verifikasi (wajib PASS)
```bash
ssh -N -L 3307:127.0.0.1:3306 alakhyar-twibbon@<vps> &   # tunnel ke MySQL VPS

SRC_DATABASE_URL='mysql://twibbon-user:<pass>@127.0.0.1:3307/twibbon-alakhyar' \
DST_DATABASE_URL='<url TiDB twibbon>' npm run migrate:verify-db

DATABASE_URL='<url TiDB twibbon>' R2_…=… R2_BUCKET=twibbon-alakhyar \
  npm run migrate:verify-r2 -- ./twibbon-files.sha256
```
- `verify-db` membandingkan jumlah baris dan SHA-256 seluruh baris per tabel, lalu mengecek email yang duplikat karena beda kapitalisasi.
- `verify-r2` memastikan setiap `imageKey` di DB ada di bucket dan isinya cocok dengan checksum VPS.

### 3.4 Cutover
1. **H-3 sampai H-7**: di Hostinger, ubah TTL record `twibbon` (A, dan AAAA kalau ada) ke **300**. Cek apakah ada record CAA yang memblokir Let's Encrypt.
2. **Hari H** (bukan hari event): kabari staf, lalu bekukan VPS:
   ```bash
   # di VPS: tambahkan UPLOADS_FROZEN=1 ke .env
   pm2 restart twibbon-alakhyar --update-env
   ```
3. **Sinkronisasi akhir**: di TiDB jalankan `TRUNCATE TABLE DownloadLog; TRUNCATE TABLE Twibbon; TRUNCATE TABLE User;` (dengan `SET FOREIGN_KEY_CHECKS=0`). Ulangi 3.2 dan 3.3, lalu **catat waktu dump** sebagai `T_dump`.
4. Netlify → *Domain management* → tambah `twibbon.alakhyar.sch.id`.
5. Hostinger: **hapus A/AAAA `twibbon`**, lalu buat **CNAME `twibbon` → `<site>.netlify.app`**. Tunggu sertifikat HTTPS terbit (beberapa menit). Selama propagasi, VPS yang read-only tetap melayani guest.
6. Salin log unduhan yang masuk ke VPS setelah dump (ulangi H+2):
   ```bash
   SRC_DATABASE_URL=… DST_DATABASE_URL=… SINCE='<T_dump ISO>' npm run migrate:delta-logs
   ```
7. **Smoke test** di `https://twibbon.alakhyar.sch.id`:
   - Login staf.
   - Upload twibbon uji ±4,9 MB, lalu muncul di Home.
   - Buka editor, pasang foto, unduh PNG.
   - Bagikan link dan cek preview OG.
   - Link `/file/<key>` lama masih jalan.
   - Hapus twibbon uji, lalu file hilang dari bucket.
   - `curl -I https://twibbon.alakhyar.sch.id/file/<key>` menunjukkan `server: Netlify` dan `cache-status` *hit* pada request kedua.

### 3.5 Rollback (14 hari pertama)
1. Bekukan Netlify: set `UPLOADS_FROZEN=1` di env Production, lalu redeploy.
2. Salin keadaan penuh TiDB ke VPS:
   ```bash
   mysqldump --ssl-mode=VERIFY_IDENTITY -h gateway01… -P 4000 -u '<prefix>.root' -p \
     --no-create-info --complete-insert --single-transaction --no-tablespaces \
     --set-gtid-purged=OFF --column-statistics=0 twibbon User Twibbon DownloadLog > rollback.sql
   # di VPS: SET FOREIGN_KEY_CHECKS=0; TRUNCATE ketiga tabel; lalu impor rollback.sql
   DATABASE_URL='<url TiDB twibbon>' R2_…=… npm run migrate:download-r2 -- ./rollback-storage
   scp rollback-storage/*.png alakhyar-twibbon@<vps>:~/htdocs/twibbon.alakhyar.sch.id/storage/
   ```
3. Di VPS: hapus `UPLOADS_FROZEN` dari `.env`, lalu `pm2 restart twibbon-alakhyar --update-env`.
4. Hostinger: hapus CNAME `twibbon`, lalu buat lagi A record ke IP VPS.

### 3.6 Dekomisi VPS (sesi terpisah)
**Prasyarat:**
- ≥14 hari stabil tanpa rollback, dan delta log terakhir sudah disalin.
- Access log nginx untuk `twibbon.alakhyar.sch.id` tidak menunjukkan trafik selama ≥7 hari.
- Backup final diarsipkan di luar VPS (`clpctl db:export --databaseName=twibbon-alakhyar`, `tar` folder `storage/`, `.env`).
- `db-backup` sudah sukses dan restore-nya sudah diuji.
- Cleanup terjadwal sudah sukses minimal sekali.

**Langkah:**
1. Sebagai `alakhyar-twibbon`: `pm2 delete twibbon-alakhyar && pm2 save`.
2. Sebagai root: hapus site CloudPanel `twibbon.alakhyar.sch.id` (**ini ikut menghapus `/home/alakhyar-twibbon` beserta `storage/`**).
3. Hapus database `twibbon-alakhyar` beserta usernya.
4. Cabut deploy key VPS di GitHub, dan hapus redirect URI Google yang sementara.
5. Di repo: hapus `ecosystem.config.cjs` dan script `deploy:update`. Rotasi `AUTH_SECRET` di Netlify (staf akan login ulang sekali).

---

## 4. Operasional
- **Cleanup manual**: `CRON_SECRET=… npm run cleanup` (production). Untuk staging: `CLEANUP_URL=https://staging--<site>.netlify.app CRON_SECRET=… npm run cleanup`. Jadwal otomatis bisa dicek di Netlify → *Functions* → `cleanup-cron` (*Run now* untuk uji).
- **Mode pemeliharaan**: `UPLOADS_FROZEN=1` menolak upload, edit, dan hapus dengan 503. Fitur lain tetap jalan.
- **Restore backup**: lihat komentar di `.github/workflows/db-backup.yml`.
- **Cache file**: `/file/<key>` di-cache setahun dan bertahan lintas deploy. Saat twibbon dihapus atau filenya diganti, cache file itu di-purge otomatis lewat tag `file-<uuid>`. Kalau log function menampilkan `cache purge API token was not found`, buat Personal Access Token Netlify lalu set sebagai env `NETLIFY_PURGE_TOKEN`.
- **Credit**: pantau di Netlify → *Usage*. Estimasi ~80 credit/bulan normal dan ~150 di bulan event.

## 5. Troubleshooting

| Gejala | Penyebab / Solusi |
|---|---|
| Upload gagal "Gagal mengunggah file ke penyimpanan" | CORS bucket belum memuat origin yang dipakai, atau token R2 salah. Cek konsol browser. |
| Upload ditolak "tidak ditemukan atau kedaluwarsa" | PUT ke R2 gagal atau lebih dari 5 menit. Pilih file lagi. |
| 500 di route yang memakai DB | `DATABASE_URL` salah/tanpa `sslaccept=strict`, atau engine Prisma `rhel-openssl-3.0.x` tidak ter-bundle (cek log function). |
| Login gagal / redirect_uri_mismatch | Redirect URI untuk host yang dipakai belum terdaftar di Google Console. |
| Gambar twibbon 404 | `imageKey` tidak ada di bucket. Jalankan `npm run migrate:verify-r2`. |
| Situs "Site not available" | Credit team habis. Aktifkan auto-recharge atau beli credit pack. |

---

## Legacy: VPS CloudPanel (sampai dekomisi)
VPS menjalankan commit tag `vps-final` lewat PM2 (`ecosystem.config.cjs`, port 3011) dan **tidak di-update lagi**. Kalau perlu restart atau membekukan VPS selama masa transisi:
```bash
su - alakhyar-twibbon
cd ~/htdocs/twibbon.alakhyar.sch.id
pm2 restart twibbon-alakhyar --update-env   # setelah ubah .env (mis. UPLOADS_FROZEN=1)
pm2 status && pm2 save
```
Jangan jalankan `npm`, `git`, atau `pm2` sebagai root di folder ini. Kepemilikan file akan rusak dan pm2 tidak akan ditemukan.
