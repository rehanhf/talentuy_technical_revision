# Arsitektur TalentPulse

## 1. Gambaran umum

TalentPulse terdiri dari tiga proses: basis data relasional, backend API, dan
frontend dashboard. Seluruhnya dijalankan bersama melalui `docker compose`.

```text
┌──────────────┐        HTTP/JSON        ┌──────────────┐      SQL       ┌────────────┐
│  Next.js 15  │ ─────────────────────▶  │  FastAPI     │ ────────────▶  │ PostgreSQL │
│  (browser)   │ ◀─────────────────────  │  (server)    │ ◀────────────  │  / SQLite  │
└──────────────┘   token JWT (Bearer)    └──────────────┘                └────────────┘
                                              │
                                              ├── connectors/ (mock, URL X publik, X API, impor CSV/JSON)
                                              ├── nlp/        (normalisasi, topik, sentimen, intent)
                                              └── search/     (SearchProvider: PostgreSQL FTS / SQLite LIKE)
```

Credential X API hanya dibaca dari environment server. Browser tidak pernah
menerima token, dan tidak ada permintaan langsung dari browser ke pihak ketiga.

## 2. Backend

| Lapisan | Berkas | Tanggung jawab |
| --- | --- | --- |
| Entry point | `app/main.py` | Registrasi router, CORS, penanganan error berbahasa Indonesia |
| Konfigurasi | `app/config.py` | Setting berbasis environment, mode data efektif |
| Model | `app/models.py` | 11 tabel ORM (lihat `data/data_dictionary.md`) |
| Filter | `app/filters.py` | `FilterSet` — satu sumber kebenaran untuk seluruh query analitik |
| Analitik | `app/analytics.py` | KPI, deret waktu, puncak, breakdown, heatmap, isu perhatian |
| NLP | `app/nlp/` | Pipeline label yang dapat dijelaskan (leksikon + aturan) |
| Pencarian | `app/search/` | Abstraksi `SearchProvider` beserta implementasi SQL |
| Connector | `app/connectors/` | `MockXConnector`, `XPublicEmbedConnector`, `OfficialXConnector`, `CsvImportConnector` |
| Ingest | `app/ingest.py` | Normalisasi, deduplikasi, analisis, pencatatan `ingestion_runs` |
| Laporan | `app/reporting.py` | Ekspor PDF (ReportLab) dan CSV agregat |
| Keamanan | `app/security.py`, `app/deps.py` | Hash bcrypt, JWT, dependency role, audit log |

### 2.1 Alur permintaan analitik

1. Frontend mengirim parameter filter (`date_from`, `date_to`, `job_roles`,
   `topics`, `sentiments`, `intents`, `min_engagement`, `q`, `query_id`).
2. `filter_params` merakitnya menjadi `FilterSet`; `parse_query` mengurai
   operator `AND`/`OR`/`-kata`/frasa.
3. `apply_saved_query` menggabungkan filter tersimpan bila `query_id` dikirim.
4. Fungsi di `analytics.py` menyusun query SQLAlchemy dengan filter yang sama
   sehingga seluruh komponen halaman konsisten satu sama lain.
5. `build_meta` melampirkan metadata: jumlah record, label periode, periode
   pembanding, mode data, kesegaran, versi model, dan provider pencarian.

Setiap response memuat blok `meta` yang sama sehingga UI selalu dapat menyatakan
dari mana angka berasal.

### 2.2 Pipeline NLP

Baseline sengaja dipilih agar hasilnya dapat dijelaskan kepada pengguna non-teknis:

1. **Normalisasi** — lowercase, penghapusan URL/mention, normalisasi slang umum.
2. **Topik** — pencocokan kata kunci taxonomy; skor tertinggi menang, tanpa
   kecocokan berarti `null` (ditampilkan sebagai "belum masuk topik").
3. **Sentimen** — leksikon positif/negatif + penanganan negasi. Selisih skor di
   bawah ambang menghasilkan label `Tidak Yakin` dan `needs_review = true`.
4. **Intent** — aturan berbasis pola (tanda tanya, kata kerja keluhan, penanda
   promosi, penanda penipuan).
5. **Kata kunci** — ekstraksi frasa untuk jaringan kata kunci terkait.

Label hasil koreksi admin diberi `model_version` bersuffiks `+koreksi-manual`
dan keyakinan 1.0 sehingga jejak human-in-the-loop tetap terlihat.

### 2.3 Rumus analitik

| Metrik | Definisi |
| --- | --- |
| Engagement score | `like×1 + repost×2 + reply×1.5 + quote×1.5` (bobot dapat dikonfigurasi) |
| Perubahan periode | `(sekarang − sebelumnya) / sebelumnya × 100`; `null` bila pembanding nol |
| Deteksi puncak | Moving average 7 hari + z-score; titik di atas ambang ditandai |
| Relevansi | Skor pencarian (FTS/LIKE) digabung kesegaran dan engagement ternormalisasi |
| Skor perhatian | Kombinasi volume, momentum kenaikan, dan porsi sentimen negatif |
| Indeks tren | Titik pertama non-nol dinormalisasi menjadi 100 |

### 2.4 Abstraksi yang menjaga jalur produksi

- **`SocialDataConnector`** — mengganti sumber data cukup dengan menambah
  implementasi baru; `MockXConnector` dan `OfficialXConnector` memakai kontrak
  `RawPost` yang sama.
- **`SearchProvider`** — PostgreSQL memakai `to_tsvector`/`ts_rank`; SQLite
  memakai LIKE. Nama provider aktif ditampilkan pada UI.
- **Mode data efektif** — `data_source_mode=live` hanya berlaku bila token
  tersedia; bila tidak, aplikasi tetap berjalan pada mode demo.

## 3. Frontend

- **Next.js 15 App Router** dengan seluruh halaman dashboard sebagai client
  component (data bersifat privat per pengguna, tidak ada rendering publik).
- **TanStack Query** untuk caching, `placeholderData` menjaga data lama tetap
  tampil saat filter berubah sehingga tidak ada kedipan layar.
- **Filter global** hidup di `useFilters` dan disinkronkan ke URL query string:
  tampilan dapat dibagikan, tombol back browser tidak menghilangkan konteks.
- **`useMeta`** menyimpan blok `meta` response terakhir untuk badge mode data,
  label periode, dan indikator kesegaran pada top bar.
- **Recharts** untuk visualisasi; setiap grafik menyediakan alternatif tabel
  (`ChartWithTable`) demi keterbacaan pembaca layar.
- **Design token** berupa CSS variable kanal RGB sehingga warna dapat diubah
  terpusat di `globals.css` tanpa menyentuh kode komponen.

## 4. Keputusan teknis

| Keputusan | Alasan |
| --- | --- |
| SQLite sebagai fallback | Proyek tetap bisa dijalankan penguji tanpa Docker |
| NLP berbasis leksikon | Dapat dijelaskan, deterministik, tanpa biaya model eksternal |
| Filter pada URL | Mendukung berbagi tampilan dan tahap *Monitoring* model Ellis |
| Ekspor post-level dibatasi | Hanya Post ID dan tautan, sesuai batas etika bagian 18 |
| Audit log di basis data | Impor, analisis ulang, dan persetujuan insight harus dapat dilacak |
| Alembic + `create_all` saat startup | Migration untuk produksi, `create_all` menjaga demo tetap mudah |

## 5. Batas yang disengaja

- Tidak ada streaming real-time; perbandingan dihitung ulang saat halaman dibuka.
- Tidak ada pencarian berbasis identitas personal, baik di API maupun di UI.
- Tidak ada penyimpanan atribut sensitif dan tidak ada inferensi terhadapnya.
- Ringkasan otomatis berhenti pada status draft — persetujuan selalu manusia.
