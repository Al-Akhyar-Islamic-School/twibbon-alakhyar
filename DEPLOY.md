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

## 1. Setup sekali (Fase 0)

Tidak ada lingkungan staging. Semua resource di bawah adalah **produksi**. Sebelum DNS dipindah, aplikasi diuji di `https://<site>.netlify.app` (lihat §3.3).

### 1.1 Cloudflare R2 (akun yang sama dengan Dinar eRapor)
1. Buat bucket **`twibbon-alakhyar`** (location hint: *Eastern North America*).
2. **CORS** (Settings → CORS policy):
   ```json
   [
     {
       "AllowedOrigins": ["https://twibbon.alakhyar.sch.id", "https://<site>.netlify.app"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   `<site>` diketahui setelah langkah 1.3. Isi bagian itu sesudahnya.
3. **Object lifecycle**: hapus objek dengan prefix `pending/` setelah **1 hari**.
4. **API token**: R2 → *Manage API tokens* → *Object Read & Write*, **hanya untuk bucket `twibbon-alakhyar`**. Jangan pakai token eRapor atau token akun-wide. Catat Account ID, Access Key ID, dan Secret Access Key.

### 1.2 TiDB Cloud Starter
1. Buat instance di **AWS us-east-1**.
2. Buat database `twibbon`.
3. *Connect* → pilih Prisma → salin URL: `mysql://<prefix>.root:<pass>@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/twibbon?sslaccept=strict`. Tambahkan `&connection_limit=3`.
4. Buat tabel dari laptop (di branch `migrate/netlify`):
   ```bash
   DATABASE_URL='<url TiDB twibbon>' npx prisma db push
   ```

### 1.3 Netlify
1. *Add new project* → *Import an existing project* → GitHub → `Al-Akhyar-Islamic-School/twibbon-alakhyar`, di team sekolah.
2. **Branch to deploy: `migrate/netlify`** selama persiapan. Setelah branch ini di-merge, kembalikan ke `main` (§3.3).
3. *Project configuration → Build & deploy → Branches and deploy contexts*:
   - **Deploy Previews: Off** (*Don't deploy pull requests*).
   - **Branch deploys: Deploy only the production branch**.

   Karena tidak ada staging, preview akan memakai DB dan bucket produksi. Jadi harus mati.
4. **Team Owner**: aktifkan **auto-recharge** dan **usage alert**. Kalau credit habis, *semua* situs di team di-pause.
5. Environment variables (context Production). Centang **"Contains secret values"** hanya untuk variabel yang memang rahasia.

   Variabel non-rahasia **tidak boleh** dicentang. Nilainya muncul di kode, dokumentasi, atau bundle browser, sehingga *secrets scanning* Netlify akan menggagalkan build. `NEXT_PUBLIC_*` khususnya selalu disisipkan ke JavaScript browser.

| Variabel | Nilai | Secret? |
|---|---|---|
| `DATABASE_URL` | URL TiDB `twibbon` (1.2) | **Ya** |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | token bucket-scoped (1.1) | **Ya** |
| `R2_ACCOUNT_ID` | Account ID Cloudflare | boleh |
| `R2_BUCKET` | `twibbon-alakhyar` | **Tidak** |
| `AUTH_SECRET` | **sama dengan `.env` VPS** selama migrasi | **Ya** |
| `AUTH_URL` | **sebelum cutover**: `https://twibbon-alakhyar.netlify.app`; **saat cutover** diganti `https://twibbon.alakhyar.sch.id` (§3.4) | **Tidak** |
| `AUTH_TRUST_HOST` | `true` | **Tidak** |
| `AUTH_GOOGLE_ID` | sama dengan VPS | boleh |
| `AUTH_GOOGLE_SECRET` | sama dengan VPS | **Ya** |
| `ALLOWED_EMAIL_DOMAIN` | `alakhyar.sch.id` | **Tidak** |
| `NEXT_PUBLIC_SITE_URL` | `https://twibbon.alakhyar.sch.id` | **Tidak** |
| `CRON_SECRET` | **hasil** perintah `openssl rand -hex 32` (64 karakter hex), bukan teks perintahnya | **Ya** |

`AUTH_URL` **wajib di-set**. Tanpa itu, Auth.js membaca host dari header `x-forwarded-host`. Di Netlify header itu berisi *permalink deploy* (`<id>--<site>.netlify.app`) yang berubah setiap deploy, sehingga callback Google selalu gagal (*redirect_uri_mismatch*). Karena itu nilainya diganti dan di-redeploy saat cutover.

6. *Deploys → Trigger deploy* (tanpa cache) setelah env diisi, karena env hanya berlaku untuk deploy berikutnya.

### 1.4 Google Cloud Console (OAuth client twibbon)
Authorized redirect URI:
- `https://twibbon.alakhyar.sch.id/api/auth/callback/google` (sudah ada, tidak berubah)
- `https://<site>.netlify.app/api/auth/callback/google` (**sementara**, untuk uji sebelum cutover; hapus setelah dekomisi)

### 1.5 GitHub Actions secrets (untuk `db-backup`)
`TIDB_HOST`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE` (= `twibbon`), dan `BACKUP_PASSPHRASE`. Simpan passphrase juga di pengelola password sekolah; tanpa passphrase ini backup tidak bisa dibuka.

Workflow ada di branch `migrate/netlify`, jadi baru bisa dijalankan setelah branch itu di-merge ke `main`. Setelah itu jalankan sekali secara manual (*Actions → db-backup → Run workflow*), lalu **uji restore** ke database sementara (langkahnya ada di komentar workflow, termasuk menghapus database uji).

---

## 2. Deploy sehari-hari (setelah cutover)
- `git push` ke `main` → production deploy otomatis (15 credit per deploy).
- Perubahan skema: jalankan `DATABASE_URL=… npx prisma db push` ke TiDB **sebelum** merge. Hanya untuk perubahan aditif (kolom/tabel baru); untuk yang destruktif, backup dulu.

---

## 3. Runbook migrasi dari VPS

> Semua perintah di VPS dijalankan sebagai user **`alakhyar-twibbon`**, bukan root (`su - alakhyar-twibbon`).

### 3.1 Persiapan VPS
- Merge `feat/freeze-flag` ke `main`, lalu deploy di VPS:
  ```bash
  cd ~/htdocs/twibbon.alakhyar.sch.id
  git pull origin main
  npm run deploy:update
  ```
- Tag commit tersebut: `git tag vps-final && git push origin vps-final`. **Setelah `migrate/netlify` di-merge ke `main`, VPS tidak boleh di-`git pull` lagi**, karena kode baru butuh kredensial R2 yang tidak ada di VPS.
- Pre-check di VPS:
  ```bash
  mysql -u twibbon-user -p twibbon-alakhyar -e "SELECT 'User',COUNT(*) FROM User UNION ALL SELECT 'Twibbon',COUNT(*) FROM Twibbon UNION ALL SELECT 'DownloadLog',COUNT(*) FROM DownloadLog"
  ls -lS storage | head
  (cd storage && sha256sum *.png) > ~/twibbon-files.sha256
  ```

### 3.2 Salin data (rehearsal, lalu diulang saat sinkronisasi akhir)
```bash
# di VPS: dump DATA SAJA (tabel sudah dibuat Prisma di TiDB)
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

Verifikasi (wajib PASS):
```bash
ssh -N -L 3307:127.0.0.1:3306 alakhyar-twibbon@<vps> &   # tunnel ke MySQL VPS

SRC_DATABASE_URL='mysql://twibbon-user:<pass>@127.0.0.1:3307/twibbon-alakhyar' \
DST_DATABASE_URL='<url TiDB twibbon>' npm run migrate:verify-db

DATABASE_URL='<url TiDB twibbon>' R2_…=… R2_BUCKET=twibbon-alakhyar \
  npm run migrate:verify-r2 -- ./twibbon-files.sha256
```
- `verify-db` membandingkan jumlah baris dan SHA-256 seluruh baris per tabel, lalu mengecek email duplikat karena beda kapitalisasi.
- `verify-r2` memastikan setiap `imageKey` di DB ada di bucket dan isinya cocok dengan checksum VPS.

### 3.3 Uji di `<site>.netlify.app` (pengganti staging)
Setelah 3.2, `<site>.netlify.app` berjalan dengan data produksi hasil rehearsal. Uji:
- Home menampilkan twibbon aktif dengan hitungan pakai yang benar.
- Link `/file/<key>` lama terbuka, termasuk file terbesar.
- Editor: pasang foto lalu unduh PNG. Canvas tidak boleh error.
- Login staf.
- Upload twibbon **uji** ±4,9 MB. File >5 MB atau PNG tanpa transparansi harus ditolak dengan pesan jelas.
- Edit dengan ganti file, lalu hapus twibbon uji.
- `curl -I https://<site>.netlify.app/file/<key>` dua kali → request kedua `cache-status` *hit*.
- Netlify → *Functions* → `cleanup-cron` → **Run now**, lalu cek lognya.

Data uji di DB akan hilang saat sinkronisasi akhir (tabel di-truncate). File ujinya dibersihkan dengan `--prune` di 3.4.

Kalau semua lolos:
1. Merge `migrate/netlify` → `main`.
2. Ubah *Branch to deploy* di Netlify kembali ke **`main`**.
3. Jangan `git pull` di VPS.

### 3.4 Cutover
1. **H-3 sampai H-7**: di Hostinger, ubah TTL record `twibbon` (A, dan AAAA kalau ada) ke **300**. Cek apakah ada record CAA yang memblokir Let's Encrypt.
2. **Hari H** (bukan hari event): kabari staf, lalu bekukan VPS:
   ```bash
   # di VPS: tambahkan UPLOADS_FROZEN=1 ke .env
   pm2 restart twibbon-alakhyar --update-env
   ```
3. **Sinkronisasi akhir**:
   - Di TiDB jalankan `SET FOREIGN_KEY_CHECKS=0; TRUNCATE TABLE DownloadLog; TRUNCATE TABLE Twibbon; TRUNCATE TABLE User;`. Ini sekaligus membuang data uji dari 3.3.
   - Ulangi langkah salin dan verifikasi di 3.2. **Catat waktu dump** sebagai `T_dump`.
   - Bersihkan file uji di bucket:
     ```bash
     DATABASE_URL='<url TiDB twibbon>' R2_…=… R2_BUCKET=twibbon-alakhyar \
       npm run migrate:verify-r2 -- ./twibbon-files.sha256 --prune
     ```
     Prune hanya berjalan kalau semua file di DB ada dan cocok.
4. Netlify → *Domain management* → tambah `twibbon.alakhyar.sch.id`. Lalu ubah env **`AUTH_URL` → `https://twibbon.alakhyar.sch.id`** dan jalankan **Trigger deploy**. Mulai saat itu login di `<site>.netlify.app` akan diarahkan ke domain asli; itu wajar karena upload memang sedang dibekukan.
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
- `db-backup` sudah sukses dan restore-nya sudah diuji ke database sementara.
- Cleanup terjadwal sudah sukses minimal sekali.

**Langkah:**
1. Sebagai `alakhyar-twibbon`: `pm2 delete twibbon-alakhyar && pm2 save`.
2. Sebagai root: hapus site CloudPanel `twibbon.alakhyar.sch.id` (**ini ikut menghapus `/home/alakhyar-twibbon` beserta `storage/`**).
3. Hapus database `twibbon-alakhyar` beserta usernya.
4. Cabut deploy key VPS di GitHub, dan hapus redirect URI Google yang sementara.
5. Di repo: hapus `ecosystem.config.cjs` dan script `deploy:update`. Rotasi `AUTH_SECRET` di Netlify (staf akan login ulang sekali).

---

## 4. Operasional
- **Cleanup manual**: `CRON_SECRET=… npm run cleanup`. Sebelum cutover: `CLEANUP_URL=https://<site>.netlify.app CRON_SECRET=… npm run cleanup`. Jadwal otomatis bisa dicek di Netlify → *Functions* → `cleanup-cron` (*Run now* untuk uji).
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
