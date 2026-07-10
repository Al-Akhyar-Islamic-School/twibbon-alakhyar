# Deploy — Twibbon Al Akhyar (CloudPanel + MySQL)

Panduan deploy ke VPS memakai **CloudPanel**, **MySQL**, **PM2**, dan alur
`git pull` seperti biasa. Domain target: `twibbon.alakhyar.sch.id`.

> Ringkas: buat site Node.js di CloudPanel → buat DB MySQL → clone repo →
> `npm ci && build` → `prisma db push` → jalankan dgn PM2 → SSL. Deploy
> berikutnya cukup `git pull` + `npm run deploy:update`.

---

## 0. Prasyarat di VPS (sekali saja)

- Node.js **20 LTS** (pilih di CloudPanel saat membuat site Node, atau via `nvm`).
- PM2 global: `npm i -g pm2`
- Git sudah terpasang.

---

## 1. Buat Site Node.js di CloudPanel

1. **Sites → Add Site → Create a Node.js Site**.
2. **Domain name**: `twibbon.alakhyar.sch.id`
3. **App Port**: `3011` (harus sama dengan `PORT` di `ecosystem.config.cjs`;
   port 3000 & 3010 sudah dipakai app lain di VPS).
4. **Node.js version**: 20.
5. Simpan. CloudPanel otomatis membuat:
   - direktori site: `/home/<site-user>/htdocs/twibbon.alakhyar.sch.id`
   - reverse proxy Nginx dari `:443/:80` → `127.0.0.1:3011`.

> Command "App start"/PM2 bawaan CloudPanel bisa dinonaktifkan; kita jalankan
> PM2 sendiri (langkah 5) agar terkontrol.

---

## 2. Buat Database MySQL di CloudPanel

1. **Databases → Add Database**.
2. Database name: `twibbon` · User: `twibbon` · Password: (kuat, catat).
3. Host koneksi dari app: `127.0.0.1:3306`.

`DATABASE_URL` yang dipakai nanti:
```
mysql://twibbon:PASSWORD_ANDA@127.0.0.1:3306/twibbon
```
> Jika password mengandung karakter spesial, URL-encode: `@`→`%40`, `#`→`%23`, `:`→`%3A`.

---

## 3. Google OAuth (Cloud Console)

Di **APIs & Services → Credentials → OAuth client ID (Web application)**, tambah
**Authorized redirect URI**:
```
https://twibbon.alakhyar.sch.id/api/auth/callback/google
```
Catat `Client ID` & `Client secret`. (OAuth consent screen: cukup "Internal"
bila Workspace `alakhyar.sch.id`, atau "External" + testing users.)

---

## 4. Clone repo + konfigurasi env

SSH sebagai user site, masuk ke direktori htdocs site:

```bash
cd /home/<site-user>/htdocs/twibbon.alakhyar.sch.id
# clone ke direktori site (kosongkan dulu jika ada file default CloudPanel)
git clone <URL_REPO_ANDA> .

cp .env.example .env
nano .env
```

Isi `.env` produksi:
```dotenv
DATABASE_URL="mysql://twibbon:PASSWORD@127.0.0.1:3306/twibbon"
AUTH_SECRET="<hasil: openssl rand -base64 32>"
AUTH_URL="https://twibbon.alakhyar.sch.id"
AUTH_TRUST_HOST="true"
AUTH_GOOGLE_ID="<client id google>"
AUTH_GOOGLE_SECRET="<client secret google>"
ALLOWED_EMAIL_DOMAIN="alakhyar.sch.id"
NEXT_PUBLIC_SITE_URL="https://twibbon.alakhyar.sch.id"
STORAGE_DIR="./storage"
```

> `NEXT_PUBLIC_SITE_URL` dibaca saat **build**, jadi pastikan sudah benar
> sebelum `npm run build`.

---

## 5. Build & jalankan (pertama kali)

```bash
npm ci                 # install bersih (termasuk sharp — native, perlu build tools)
npm run build          # prisma generate + next build
npm run db:push        # buat tabel di MySQL
npm run icons          # generate ikon PWA
# (opsional) npm run db:seed   # 3 twibbon contoh — lewati bila mulai bersih

pm2 start ecosystem.config.cjs
pm2 save               # simpan daftar proses
pm2 startup            # ikuti instruksi agar PM2 auto-start saat reboot
```

Cek: `pm2 status` dan `pm2 logs twibbon-alakhyar`.

---

## 6. SSL / HTTPS

Di CloudPanel: **site → SSL/TLS → Actions → New Let's Encrypt Certificate**.
Setelah aktif, buka `https://twibbon.alakhyar.sch.id`.

> PWA (installable + service worker) hanya aktif di HTTPS/produksi — ini otomatis
> setelah SSL terpasang.

---

## 7. Deploy ulang (setiap update)

Karena Anda push ke origin lalu pull di server:

```bash
cd /home/<site-user>/htdocs/twibbon.alakhyar.sch.id
git pull origin main
npm run deploy:update      # ci + build + db push + restart PM2 (lihat script)
```

`storage/` dan `.env` **tidak** tersentuh `git pull` (keduanya di-`.gitignore`),
sehingga file twibbon yang sudah diunggah dan konfigurasi tetap aman.

---

## Catatan Operasional

- **Backup rutin**: dump DB MySQL + folder `storage/` (file PNG twibbon ada di sini).
  ```bash
  mysqldump -u twibbon -p twibbon > backup-$(date +%F).sql
  tar czf storage-$(date +%F).tgz storage/
  ```
- **Persistensi upload**: file twibbon disimpan di `storage/` pada direktori app.
  Jangan hapus folder ini saat deploy. (Untuk skala sangat besar / multi-server,
  pindah ke object storage + CDN — ganti `src/lib/storage.ts`.)
- **Ukuran upload**: batas 5MB per twibbon (server) sudah divalidasi di app.
  Pastikan `client_max_body_size` Nginx CloudPanel ≥ 8M bila perlu (default
  CloudPanel biasanya cukup).
- **Reset admin/seed**: kolom `role` (`staff`/`admin`) ada di tabel `User`.
  Untuk membatasi upload hanya admin (PRD §12 Opsi B), set role via SQL:
  `UPDATE User SET role='admin' WHERE email='nama@alakhyar.sch.id';`
- **Log**: `pm2 logs twibbon-alakhyar` · restart: `pm2 restart twibbon-alakhyar`.

## Troubleshooting

| Gejala | Penyebab / Solusi |
|---|---|
| 502 Bad Gateway | App belum jalan / port beda. Cek `pm2 status`, cocokkan `PORT` dgn App Port CloudPanel. |
| Login gagal / redirect error | `AUTH_URL` salah, atau redirect URI Google belum sama persis. |
| `Access Denied` saat login | Email di luar `*.alakhyar.sch.id` — sesuai kebijakan. |
| Error `sharp` saat `npm ci` | Pastikan build tools ada; coba `npm rebuild sharp` atau Node 20. |
| Gambar twibbon 404 | Folder `storage/` terhapus / permission. Pastikan writable oleh user app. |
| Perubahan skema DB tak muncul | Jalankan `npm run db:push` lagi setelah `git pull`. |
