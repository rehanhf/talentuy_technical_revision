# Panduan Deployment

## 1. Prasyarat

| Kebutuhan | Versi |
| --- | --- |
| Docker Engine + Compose plugin | 24+ |
| Alternatif tanpa Docker: Python | 3.12 |
| Alternatif tanpa Docker: Node.js | 20 LTS |
| PostgreSQL (produksi) | 14+ |

## 2. Deployment lokal / demo

```bash
cp .env.example .env
docker compose up --build -d
docker compose exec backend python -m app.seed --reset
docker compose ps          # ketiga layanan harus "healthy"/"running"
curl http://localhost:8000/health
```

`--reset` menghapus **seluruh** data, termasuk data nyata, insight, akun, dan
audit log. Untuk menyegarkan data demo saja (mis. pada hari pengujian), pakai:

```bash
docker compose exec backend python -m app.seed --reseed-demo
```

Perintah ini mengganti 1.400 post sintetis agar berakhir pada hari itu dan
memuat satu lonjakan isu pada minggu berjalan; data nyata, insight, akun, dan
audit log tidak disentuh. Jalankan pada pagi hari pengujian.

Menghentikan dan membersihkan:

```bash
docker compose down          # hentikan
docker compose down -v       # hentikan + hapus volume database
```

## 3. Konfigurasi environment

| Variabel | Wajib | Catatan |
| --- | --- | --- |
| `DATABASE_URL` | ya (produksi) | `postgresql+psycopg://user:pass@host:5432/db` |
| `JWT_SECRET` | ya | Minimal 32 karakter acak; **ganti dari nilai contoh** |
| `CORS_ORIGINS` | ya | Daftar origin frontend dipisah koma |
| `ENVIRONMENT` | tidak | `development` / `staging` / `production` |
| `DATA_SOURCE_MODE` | tidak | `demo` (bawaan) atau `live` |
| `X_API_BEARER_TOKEN` | hanya mode live | Hanya di server; tanpa token aplikasi tetap mode demo |
| `DEMO_PASSWORD` | tidak | Ganti atau nonaktifkan akun demo di produksi |
| `NEXT_PUBLIC_API_BASE_URL` | ya | Dibaca saat build frontend; ikut ter-bundle ke browser |

Menghasilkan secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## 4. Migration database

```bash
docker compose exec backend alembic upgrade head      # terapkan
docker compose exec backend alembic current           # revisi aktif
docker compose exec backend alembic downgrade -1      # mundur satu revisi
```

Container backend menjalankan `alembic upgrade head` otomatis sebelum server
menyala. Migration baru setelah mengubah model:

```bash
cd apps/api
alembic revision --autogenerate -m "tambah kolom x"
# periksa berkas hasil generate sebelum di-commit
alembic upgrade head
```

## 5. Deployment produksi

1. **Database** — PostgreSQL terkelola dengan backup harian. Terapkan migration
   sebelum menaikkan versi aplikasi.
2. **Backend** — jalankan image `apps/api` di belakang reverse proxy (Nginx,
   Caddy, atau load balancer). Aktifkan HTTPS; set `CORS_ORIGINS` ke domain
   frontend saja.
3. **Frontend** — build dengan `NEXT_PUBLIC_API_BASE_URL` yang benar (nilai ini
   ter-bundle ke browser, jadi build ulang bila URL berubah).
4. **Akun** — nonaktifkan akun demo, buat akun nyata melalui admin, ganti
   `DEMO_PASSWORD`.
5. **Mode data** — set `DATA_SOURCE_MODE=live` dan isi `X_API_BEARER_TOKEN`
   hanya setelah dasar hukum akses X API tersedia.

Checklist sebelum rilis:

- [ ] `JWT_SECRET` unik per environment.
- [ ] Tidak ada `.env` yang ikut ter-commit (`git check-ignore .env`).
- [ ] Backup database terjadwal dan pernah diuji restore.
- [ ] `pytest`, `npm run lint`, `npm run typecheck`, `npm run build`, dan
      `npx playwright test` lolos di CI.
- [ ] `/health` dipantau (`status: ok` dan `database.connected: true`).
- [ ] Log aplikasi dikumpulkan; audit log direview berkala.

## 6. monitoring operasional

| Endpoint/Tempat | Dipakai untuk |
| --- | --- |
| `GET /health` | Liveness/readiness probe |
| Halaman Data & Pengaturan → Log proses data | Kegagalan impor dan analisis ulang |
| Halaman Data & Pengaturan → Audit log | Perubahan taxonomy, koreksi label, ekspor |
| Halaman Data & Pengaturan → Kualitas data | Cakupan analisis dan porsi perlu ditinjau |
| Badge "data mungkin belum terbarui" | Data lebih lama dari ambang kesegaran |

## 7. Pemecahan masalah

| Gejala | Penyebab umum | Tindakan |
| --- | --- | --- |
| Frontend menampilkan "Tidak dapat terhubung ke server" | Backend belum siap atau URL API salah | `docker compose logs backend`; periksa `NEXT_PUBLIC_API_BASE_URL` |
| Permintaan diblokir CORS | `CORS_ORIGINS` tidak memuat origin frontend | Tambahkan origin lalu restart backend |
| Dashboard kosong setelah setup | Seed belum dijalankan | `docker compose exec backend python -m app.seed --reset` |
| Badge tetap `DATA DEMO` padahal mode live | Token X API kosong atau tidak valid | Isi `X_API_BEARER_TOKEN` di server lalu restart |
| Login selalu gagal | Password demo berbeda dari `.env` | Samakan `DEMO_PASSWORD` lalu seed ulang |
| `alembic upgrade` gagal | Database belum siap | Tunggu healthcheck `db` lalu ulangi |

## 8. Backup dan pemulihan

```bash
# Backup
docker compose exec db pg_dump -U talentpulse talentpulse > backup.sql

# Restore
cat backup.sql | docker compose exec -T db psql -U talentpulse talentpulse
```
