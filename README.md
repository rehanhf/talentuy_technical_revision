# TalentPulse

**Dengar percakapan kandidat. Perjelas komunikasi rekrutmen.**

Dasbor informasi berbasis web untuk tim Recruitment/HR yang mengubah percakapan
publik pencari kerja di media sosial X menjadi informasi terstruktur: menemukan
pertanyaan dan keluhan yang berulang, menelusurinya sampai ke cuplikan aslinya,
lalu menjadikannya bahan FAQ, konten edukasi, dan perbaikan komunikasi lowongan.

> **Prototipe akademis.** Karya tugas akhir Program Studi Sains Informasi, FISIP
> UPN "Veteran" Jakarta, skema Perancangan Karya Digital Dashboard Information.
> TalentPulse tidak berafiliasi resmi dengan X, tidak memprofilkan kandidat
> perseorangan, tidak mengakses basis data internal perusahaan, dan tidak boleh
> dipakai sebagai dasar keputusan penerimaan atau penolakan kandidat. Data
> disajikan pada tingkat agregat, sejalan dengan Undang-Undang Nomor 27 Tahun
> 2022 tentang Pelindungan Data Pribadi. Pada mode demo seluruh angka berasal
> dari **dataset sintetis** dan diberi label `DATA SINTETIS — BUKAN TEMUAN AKTUAL`.

## Status

Seluruh fitur MVP yang tercantum pada [Fitur MVP](#fitur-mvp) selesai dan dapat
dijalankan dari clean setup, termasuk empat pekerjaan yang dijanjikan naskah tugas
akhir; lihat [Pekerjaan wajib dari naskah](#pekerjaan-wajib-dari-naskah). Dua hal
masih menunggu keputusan; lihat [Perlu diputuskan](#perlu-diputuskan).

| Aspek | Status |
| --- | --- |
| Halaman | 8 halaman utama + login, seluruhnya berbahasa Indonesia |
| Backend | pytest lolos — jumlah terkini lihat [`docs/testing_report.md`](docs/testing_report.md) |
| Frontend | Vitest lolos · `tsc --noEmit` dan ESLint bersih · `next build` sukses |
| End-to-end | Playwright: Tugas 1–5, fitur naskah, peran & data, aksesibilitas, visual QA — hasil di [`docs/testing_report.md`](docs/testing_report.md) |
| Aksesibilitas | Audit axe-core WCAG 2.1 AA pada 9 halaman: nol pelanggaran |
| Performa | `/dashboard/overview` 49 ms pada 1.400 post, 134 ms pada 5.000 post (target < 3 detik) |
| Data demo | 1.400 post sintetis / 90 hari, dapat direproduksi dari generator |
| Kesiapan naskah | 4 pekerjaan wajib selesai, 2 keputusan belum diambil, daftar jenis pekerjaan perlu dicocokkan dengan transkrip |

> **Jumlah pengujian ditulis di satu tempat saja**, yaitu
> [`docs/testing_report.md`](docs/testing_report.md). Versi README sebelumnya
> menyebut dua angka berbeda untuk hal yang sama (61/43 pada tabel status, 58/38
> pada bagian Pengujian). Jangan menuliskan ulang angka itu di README; perbarui
> `docs/testing_report.md` setelah menjalankan `pytest` dan `npm run test`.

---

## Keselarasan dengan naskah tugas akhir

Repositori ini adalah karya dari sebuah tugas akhir, sehingga setiap fitur harus
dapat ditunjuk ke janji yang tertulis di naskah. Tabel berikut adalah rujukan
tunggal saat menambah atau mengubah fitur.

| Janji di naskah | Letak | Wujud di sistem | Status |
| --- | --- | --- | --- |
| Sumber data hanya unggahan asal berbahasa Indonesia di X | 1.3 butir 2 | Connector + filter ingest | Selesai |
| Empat kategori isu: upah, kontrak, giliran kerja, keabsahan lowongan | 1.3 butir 2 | Taxonomy + `nlp/` | Selesai |
| Tiga intensi: pertanyaan, keluhan, pengalaman | 1.3 butir 2 | Label intent | Selesai |
| Lima jenis pekerjaan sebagai partisi dan filter | 1.3 butir 2, Tujuan 2 | `taxonomy.JOB_ROLES`, filter global, kartu partisi Eksplorasi Topik, heatmap Overview | Selesai |
| Dua mode data beserta penandanya | 1.3 butir 3 | Badge + watermark laporan | Selesai |
| Tiga peran pengguna | 1.3 butir 4 | Dihapus: satu tingkat akses setelah login, dilindungi tiga aturan insight | **Menyimpang dari naskah** |
| Dasar klasifikasi tampil di antarmuka | 1.3 butir 5, Tujuan 3 | `post_analysis.explanation` + panel detail post | Selesai |
| Koreksi label oleh admin + audit log | 1.3 butir 5 | Detail post (setiap pengguna login mengoreksi langsung; audit log dan `auto_rule` menyimpan label asal) | **Menyimpang dari naskah** |
| Batas etika, agregat, tanpa pemrofilan | 1.3 butir 6 | Metodologi & Etika | Selesai |
| Enam karakteristik Ellis jadi fitur | Tujuan 2, 2.1.1 | 6 dari 6 — *starting* lewat preset kata kunci | Selesai |
| Dua konstruk IFT: *scent* dan *patches* | 2.1.2 | *Patches* = kartu kategori isu × jenis pekerjaan | Selesai |
| Penelusuran berjenjang sampai cuplikan asli | Tujuan 3 | Drill-down + detail post | Selesai |
| Pengujian kebergunaan dengan SUS | Tujuan 4 | Skenario Tugas 1–5 + kuesioner SUS 10 butir | Instrumen siap; pengujian dengan staf HR belum dilaksanakan |

### Padanan istilah antarmuka dan naskah

Naskah memakai istilah Indonesia, antarmuka memakai istilah Inggris. Tangkapan
layar akan masuk ke Bab IV, jadi padanannya perlu konsisten dan disebut sekali di
naskah.

| Antarmuka | Naskah |
| --- | --- |
| Dashboard | dasbor informasi TalentPulse |
| topic / sentiment / intent | kategori isu / polaritas sentimen / intensi percakapan |

---

## Pekerjaan wajib dari naskah

Keempatnya dijanjikan di Bab I dan Bab II dan kini tersedia untuk demonstrasi
sidang. Rincian teknis ada di [`docs/api.md`](docs/api.md) dan
[`data/data_dictionary.md`](data/data_dictionary.md).

### 1. Partisi dan penyaringan jenis pekerjaan — selesai

- Lima nilai mengikuti 1.3 butir 2: `spg_spb` (SPG/SPB), `staf_gudang`
  (Staf Gudang), `kasir` (Kasir), `administrasi` (Administrasi), `pengemudi`
  (Pengemudi), ditambah `Lainnya` untuk post yang tidak menyebut kelimanya. Yang
  disimpan di basis data adalah label; kodenya ada di `JOB_ROLE_CODES`.
- Tagger NLP, generator data demo, dan filter global memakai daftar yang sama.
- Eksplorasi Topik menampilkan kartu per kombinasi kategori isu × jenis pekerjaan;
  "Lihat post" membuka Pencarian Post dengan kedua filter terpasang di URL.
- Overview memuat matriks kategori isu × jenis pekerjaan (heatmap).
- **Masih perlu dilakukan:** cocokkan daftar ini dengan transkrip wawancara. Bila
  transkrip menyebut daftar lain, ubah naskah 1.3 butir 2 dan `app/taxonomy.py`
  bersama-sama.
- **Basis data lama:** migration `b7c2d9e4f1a0` memetakan label lama (mis.
  `Driver` → `Pengemudi`, `Operator` → `Lainnya`). Pemetaan ini hanya pendekatan;
  jalankan **Data & Pengaturan → Analisis ulang** agar label dihitung ulang dari
  teks post.

### 2. Preset kata kunci — selesai

- Pencarian Post menampilkan preset per kategori isu; sekali klik mengisi kueri.
- Preset disimpan di tabel `keyword_presets` dan disunting pengguna lewat
  **Data & Pengaturan → Preset kata kunci**; perubahan tercatat di audit log.

### 3. Tampilan dasar klasifikasi di antarmuka — selesai

- Pipeline `nlp/` menyimpan aturan yang terpicu dan kata pemicu untuk keempat
  label (kategori isu, polaritas sentimen, intensi, jenis pekerjaan) di
  `post_analysis.explanation`; API mengembalikannya apa adanya.
- Detail post menampilkan aturan tiap label dan menyorot kata pemicu pada teks
  asli. Pemicu yang baru cocok setelah normalisasi slang diberi keterangan.
- Dari tampilan yang sama, pengguna login mengoreksi label secara langsung. Label
  yang dikoreksi tetap memperlihatkan aturan otomatis semula.
- Post yang dianalisis sebelum fitur ini menampilkan pemberitahuan sampai
  analisis ulang dijalankan.

### 4. Kuesioner SUS 10 butir — selesai

- [`docs/usability_test.md`](docs/usability_test.md) bagian 6 memuat 10 butir
  *System Usability Scale* (Brooke, 1996) berbahasa Indonesia, skala 1–5, lembar
  jawaban, cara penghitungan skor dengan contoh, tabel rekap, dan interpretasi.

---

## Perlu diputuskan

| Hal | Keadaan | Pilihan |
| --- | --- | --- |
| Pengurutan berdasarkan *engagement* di Pencarian Post | Data engagement tidak tersedia untuk post nyata melalui oEmbed | Hapus dari MVP, **atau** batasi hanya mode demo dan nyatakan pada Metodologi & Etika |
| Peran pengguna pada naskah | Sistem tidak lagi membedakan peran, sedangkan 1.3 butir 4 dan 5 masih menyebut tiga peran dan koreksi oleh admin | Revisi 1.3 butir 4 dan 5 agar memakai aturan insight: penulis dan penyunting terakhir tidak menyetujui, perubahan isi menggugurkan persetujuan, insight yang pernah disetujui tidak dapat dihapus |

---

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
docker compose exec backend python -m app.seed --reset
```

| Layanan | URL |
| --- | --- |
| Dashboard web | http://localhost:3000 |
| API | http://localhost:8000 |
| Dokumentasi API (Swagger) | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |

### Akun demo

| Nama | Email |
| --- | --- |
| Rani Prameswari | `rani@talentpulse.local` |
| Dimas Anugrah | `dimas@talentpulse.local` |
| Sinta Larasati | `sinta@talentpulse.local` |

Di luar `ENVIRONMENT=production`, halaman masuk menampilkan ketiga nama ini; klik
salah satunya untuk mengisi email dan kata sandi. Database lama ikut diperbarui oleh
migration `f2b8d4e6a1c3` (`admin@` → `rani@`, `analyst@` → `dimas@`, `viewer@` → `sinta@`).

Ketiga akun memiliki akses yang sama. Tiga akun dipertahankan karena insight harus
disetujui oleh akun selain penulisnya. Seed/reset dan analisis ulang lewat API serta
antarmuka hanya aktif bila `ENABLE_SYSTEM_OPS=true`; biarkan `false` pada deployment pengujian.

Password demo: nilai `DEMO_PASSWORD` pada `.env` (bawaan `TalentPulse123!`).
Password ini **hanya untuk development**; ganti sebelum dipakai di lingkungan lain.

---

## Menjalankan tanpa Docker

### Backend (FastAPI, Python 3.12)

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

alembic upgrade head             # membuat skema (SQLite bila DATABASE_URL kosong)
python -m app.seed --reset       # dataset demo sintetis + akun demo
uvicorn app.main:app --reload --port 8000
```

Tanpa `DATABASE_URL`, backend memakai SQLite (`apps/api/talentpulse.db`) sehingga
proyek tetap bisa dijalankan tanpa Docker. Periksa dengan:

```bash
curl http://localhost:8000/health
# {"status":"ok","database":{"connected":true},"data_source_mode":"demo","seeded":true,...}
```

### Frontend (Next.js 15, Node 20+)

```bash
cd apps/web
cp .env.local.example .env.local
npm install
npm run dev                      # http://localhost:3000
```

Buka http://localhost:3000, masuk dengan salah satu akun demo, lalu mulai dari
**Overview**. Badge `DATA DEMO` pada top bar menandakan seluruh angka berasal
dari dataset sintetis.

---

## Struktur repositori

```text
talentpulse/
├── apps/
│   ├── api/                    # FastAPI, SQLAlchemy, Alembic, NLP baseline
│   │   ├── app/
│   │   │   ├── routers/        # auth, dashboard, posts, queries, insights, reports, data, system
│   │   │   ├── nlp/            # pipeline label topik, sentimen, intent (dapat dijelaskan)
│   │   │   ├── search/         # abstraksi pencarian (SQL provider)
│   │   │   └── connectors/     # mock, URL post X, X API, impor CSV/JSON
│   │   ├── alembic/            # database migration
│   │   └── tests/              # pytest
│   └── web/                    # Next.js App Router, Tailwind, Recharts
│       └── src/
│           ├── app/(dashboard)/# 8 halaman utama
│           ├── components/     # shell, chart, filter, state UI
│           ├── hooks/          # auth, filter global, data fetching
│           └── lib/            # klien API, format ID, design token merek
├── data/
│   ├── synthetic/              # contoh berkas impor
│   └── data_dictionary.md
├── docs/                       # arsitektur, IA, API, etika, usability, deployment
│   └── screenshots/            # 8 halaman × 4 ukuran layar (dihasilkan e2e)
├── tests/e2e/                  # Playwright: Tugas 1–5 + visual QA
├── docker-compose.yml
├── playwright.config.ts
├── .env.example
└── README.md
```

---

## Fitur MVP

1. Login demo wajib; role disimpan untuk identitas akun, bukan gerbang fitur UI/API.
2. Pencarian global dengan operator `AND`, `OR`, `-kata`, dan frasa berkutip.
3. **Overview** — KPI, volume harian, puncak percakapan, isu yang perlu perhatian.
4. **Analisis Tren** — granularitas harian/mingguan, perbandingan periode, breakdown.
5. **Eksplorasi Topik** — kartu topik, kartu kategori isu × jenis pekerjaan, drill-down, kata kunci terkait.
6. **Pencarian Post** — pencarian, preset kata kunci, pengurutan relevansi/waktu/engagement,
   detail post dengan dasar klasifikasi dan koreksi label.
7. **Monitoring** — query tersimpan, tren 7 hari, duplikat/arsip.
8. **Laporan Insight** — alur draft → ditinjau → disetujui, ekspor PDF/CSV agregat.
9. **Data & Pengaturan** — status connector, impor URL post X atau CSV/JSON, kualitas data,
   taxonomy, preset kata kunci, analisis ulang, log proses, audit log.
10. **Metodologi & Etika** — sumber data, pengolahan, keterbatasan, landasan teori.
11. Filter global lintas halaman yang tersimpan pada URL.
12. State loading, kosong, tanpa hasil, error, dan data usang.

Daftar lengkap beserta fitur lanjutan: [`docs/features.md`](docs/features.md).

---

## Perintah yang sering dipakai

| Perintah | Keterangan |
| --- | --- |
| `cd apps/api && pytest` | Unit test backend |
| `cd apps/api && python -m app.seed --reset` | Bangkitkan ulang dataset demo |
| `cd apps/api && alembic upgrade head` | Terapkan migration |
| `cd apps/api && alembic revision --autogenerate -m "pesan"` | Migration baru |
| `cd apps/web && npm run dev` | Frontend mode pengembangan |
| `cd apps/web && npm run typecheck` | Pemeriksaan tipe TypeScript (strict) |
| `cd apps/web && npm run lint` | ESLint |
| `cd apps/web && npm run test` | Unit test frontend (Vitest) |
| `cd apps/web && npm run build && npm run start` | Build lalu jalankan mode produksi |
| `npm run typecheck` (dari root) | Periksa tipe `tests/e2e` dan `playwright.config.ts` |
| `npm run e2e` (dari root) | End-to-end + visual QA |

---

## Pengujian

Jumlah pengujian terkini hanya dicatat di
[`docs/testing_report.md`](docs/testing_report.md). Perbarui dokumen itu setiap
kali menambah atau menghapus pengujian.

### Backend

```bash
cd apps/api
pytest                      # KPI, filter, relevansi, aturan insight, impor CSV
```

### Frontend

```bash
cd apps/web
npm run typecheck && npm run lint
npm run test                # filter, format, state UI, login
```

### End-to-end dan visual QA

Sekali saja, dari root:

```bash
npm install                 # @playwright/test
npm run e2e:install         # unduh Chromium
```

Backend **harus** sudah menyala dan basis datanya terisi; frontend dijalankan
otomatis oleh Playwright (`webServer` pada `playwright.config.ts` menjalankan
`npm run dev` di `apps/web`, dan memakai server yang sudah ada bila ditemukan).

```bash
cd apps/api && python -m app.seed --reset          # sekali
cd apps/api && uvicorn app.main:app --port 8000    # terminal terpisah

npm run e2e                       # dari root: seluruh 20 skenario
npm run e2e -- usability-tasks    # Tugas 1–5
npm run e2e -- accessibility      # audit axe-core + keyboard + focus trap
npm run e2e -- roles-and-data     # akses setelah login, aturan insight, impor CSV, taxonomy
npm run e2e -- visual-qa          # screenshot + cek overflow
```

Skenario `tests/e2e/usability-tasks.spec.ts` persis mengikuti Tugas 1–5 pada
[`docs/usability_test.md`](docs/usability_test.md), sehingga pengujian otomatis
dan pengujian bersama pengguna memakai alur yang sama.
`tests/e2e/visual-qa.spec.ts` menyimpan 32 tangkapan layar ke
`docs/screenshots/<ukuran>/<halaman>.png` sekaligus memastikan tidak ada
overflow horizontal pada 1366×768, 1920×1080, tablet 768 px, dan mobile 390 px.

---

## Mode data: demo vs live

| | Demo | Live |
| --- | --- | --- |
| Sumber | Generator sintetis (`MockXConnector`) | `OfficialXConnector` (X API resmi) |
| Aktif bila | Bawaan | `DATA_SOURCE_MODE=live` **dan** `X_API_BEARER_TOKEN` terisi |
| Penanda UI | Badge `DATA DEMO` + watermark laporan | Badge `DATA LIVE` |

Token API hanya dibaca dari environment server dan tidak pernah dikirim ke
browser. Bila token tidak tersedia, aplikasi otomatis kembali ke mode demo tanpa
mengubah arsitektur.

### Memasukkan data nyata

Tiga jalur, semuanya melewati pipeline yang sama (deduplikasi → analisis NLP →
`ingestion_runs` → audit log):

1. **Impor URL post X publik** — tempel URL post yang sudah diketahui pada
   **Data & Pengaturan → Impor satu post X publik**. Server membaca representasi
   oEmbed publik dari X; fitur ini tidak mencari post berdasarkan kata kunci.
2. **Impor berkas** — tersedia tanpa biaya. Siapkan CSV/JSON dengan kolom
   `external_post_id`, `text`, `created_at_source`, tambahkan kolom
   `is_synthetic` bernilai `false` agar tidak ditandai data demo, lalu unggah di
   **Data & Pengaturan → Impor data**. Berkas harus berasal dari
   ekspor resmi atau dataset yang Anda punya dasar izinnya — produk ini tidak
   menyediakan scraping.
3. **X API resmi** — isi `X_API_BEARER_TOKEN` di environment server, jalankan
   ulang backend, lalu pakai **Data & Pengaturan → Tarik data dari X API**
   (atau `POST /data/fetch-live?query=...`). Endpoint pencarian resmi hanya
   menjangkau **7 hari terakhir**, maksimal 100 post per permintaan, dan
   memerlukan langganan X API berbayar. Selama token kosong, tombolnya nonaktif
   dan permintaan ditolak dengan kode 409 beserta penjelasannya.

### Provider pihak ketiga: twitterapi.io

Provider ini dapat dipakai untuk pencarian post X. Pada `.env` root (Docker), atau
`apps/api/.env` untuk backend lokal, isi:

```dotenv
X_API_PROVIDER=twitterapi_io
TWITTERAPI_IO_KEY=your_key
```

Jalankan `docker compose up -d --build backend frontend`, lalu masuk ke
**Data & Pengaturan**. Pilih 20 post untuk uji pertama (maksimal satu halaman).
Lima Template Keyword (alih daya umum, upah dan potongan, BPJS dan administrasi,
kontrak dan penempatan, rekrutmen bermasalah) mengisi kotak kueri tanpa menarik data;
penarikan tetap dimulai lewat tombol **Tarik data**. Daftarnya ada di
`apps/web/src/lib/fetch-templates.ts`.
Batas 50/100 post memakai maksimal 3/5 halaman; hasil dapat lebih sedikit.
Tidak ada retry otomatis atau pengambilan terjadwal. Setiap pencarian dapat memakai
kredit provider, termasuk pencarian ulang post yang sudah tersimpan. API key hanya
ada di backend. Post disimpan dengan sumber `twitterapi_io`, bukan sebagai data
sintetis. Data demo yang sudah ada tidak dihapus. `DATA_SOURCE_MODE=live` dapat
mengaktifkan mode live, tetapi tidak menghapus atau mengubah label data sintetis.

Dokumentasi: https://docs.twitterapi.io/api-reference/endpoint/tweet_advanced_search

---

## Pemecahan masalah

| Gejala | Penyebab | Tindakan |
| --- | --- | --- |
| Dashboard kosong tetapi tanpa error | Basis data belum di-seed | `cd apps/api && python -m app.seed --reset` |
| "Tidak dapat terhubung ke server" di UI | Backend belum menyala atau `NEXT_PUBLIC_API_BASE_URL` salah | Cek `curl http://localhost:8000/health`, lalu nilai di `apps/web/.env.local` |
| Permintaan diblokir CORS | Origin frontend belum terdaftar | Tambahkan ke `CORS_ORIGINS`, restart backend |
| `npm run start` gagal: *Could not find a production build* | Folder `.next` berisi artefak `npm run dev` (mis. setelah menjalankan e2e) | Jalankan `npm run build` lagi sebelum `npm run start` |
| E2E gagal di langkah pertama dengan pesan backend tidak terhubung | Backend belum menyala saat Playwright mulai | Nyalakan backend lebih dulu; frontend ditangani Playwright |
| Badge tetap `DATA DEMO` padahal ingin live | `X_API_BEARER_TOKEN` kosong atau tidak valid | Isi token di environment server, lalu restart backend |
| Port 3000/8000 sudah terpakai | Proses lama masih berjalan | Hentikan proses tersebut, atau ubah `WEB_PORT`/`API_PORT` |
| `curl http://localhost:8000/...` terasa lambat ~2 detik | Resolusi IPv6 (`::1`) gagal lebih dulu pada sebagian mesin Windows | Pakai `http://127.0.0.1:8000`; browser tidak terpengaruh |

Panduan operasional lengkap: [`docs/deployment.md`](docs/deployment.md).

---

## Dokumentasi

| Dokumen | Isi |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | Arsitektur sistem, alur data, keputusan teknis |
| [`docs/information_architecture.md`](docs/information_architecture.md) | Navigasi, labeling, filter, penerapan model Ellis |
| [`docs/api.md`](docs/api.md) | Referensi endpoint dan parameter |
| [`docs/design_tokens.md`](docs/design_tokens.md) | Palet, tipografi, spacing, komponen |
| [`docs/ethics.md`](docs/ethics.md) | Etika, privasi, kepatuhan, keterbatasan |
| [`docs/usability_test.md`](docs/usability_test.md) | Skrip pengujian dengan staf Recruitment/HR |
| [`docs/testing_report.md`](docs/testing_report.md) | Cakupan, hasil, dan **jumlah** pengujian |
| [`docs/self_qa_dan_peraturan_dashboard.md`](docs/self_qa_dan_peraturan_dashboard.md) | Analisis terkini, self-QA, risiko, dan peraturan penggunaan dashboard |
| [`docs/screenshots/`](docs/screenshots) | Tangkapan layar 8 halaman pada 4 ukuran layar |
| [`docs/deployment.md`](docs/deployment.md) | Panduan deployment dan operasional |
| [`docs/features.md`](docs/features.md) | Fitur MVP dan roadmap lanjutan |
| [`data/data_dictionary.md`](data/data_dictionary.md) | Kamus data seluruh tabel |

---

## Catatan untuk kontributor

Karya ini dinilai sebagai tugas akhir, sehingga dua aturan berlaku di atas
pertimbangan teknis mana pun.

1. **Setiap fitur baru harus dapat ditunjuk ke janji di naskah.** Bila sebuah
   fitur tidak ada di Bab I atau Bab II, tambahkan dulu janjinya di naskah, atau
   jangan dibangun. Sebaliknya, janji yang ada di naskah tetapi tidak ada di
   sistem adalah bug, bukan fitur lanjutan.
2. **Jangan mengklaim prediksi.** Sistem mendeteksi lonjakan yang sudah terjadi,
   bukan memperkirakan apa yang akan viral. Peramalan menuntut model, data latih,
   dan metrik evaluasi yang tidak ada di repositori ini. Hindari kata "prediksi",
   "forecast", dan "akan viral" pada UI, dokumen, maupun pesan commit.
