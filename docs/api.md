# API TalentPulse

Base URL pengembangan: `http://localhost:8000`
Dokumentasi interaktif: `/docs` (Swagger) dan `/redoc`. Skema OpenAPI: `/openapi.json`.

## 1. Autentikasi

Seluruh endpoint kecuali `/health`, `/methodology`, dan `/auth/*` memerlukan
header `Authorization: Bearer <token>`. Token JWT diperoleh dari `/auth/login`
dan berlaku 12 jam (`JWT_EXPIRE_MINUTES`).

| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| POST | `/auth/login` | – | Body `{ "email", "password" }` → `{ access_token, user }` |
| GET | `/auth/me` | login | Profil pengguna aktif |
| GET | `/auth/demo-accounts` | – | Nama dan email akun demo serta kata sandi demo; 404 bila `ENVIRONMENT=production` |

Seluruh pengguna login memiliki akses yang sama; kolom `users.role` tidak dipakai untuk otorisasi.

## 2. Filter global

Endpoint analitik menerima parameter berikut. Semua bersifat opsional; bila
`date_from`/`date_to` kosong dipakai 30 hari terakhir.

| Parameter | Tipe | Catatan |
| --- | --- | --- |
| `date_from`, `date_to` | ISO 8601 | Dinormalisasi ke awal/akhir hari |
| `query_id` | string | ID query tersimpan; filternya digabung dengan filter aktif |
| `job_roles` | string (berulang) | Contoh `?job_roles=Admin&job_roles=Driver` |
| `topics` | string (berulang) | Slug topik |
| `sentiments` | string (berulang) | `Positif`, `Netral`, `Negatif`, `Tidak Yakin` |
| `intents` | string (berulang) | Kategori intent |
| `languages` | string (berulang) | `id`, `en` |
| `min_engagement`, `max_engagement` | float ≥ 0 | Rentang skor interaksi |
| `q` | string | Operator `AND`, `OR`, `-kata`, frasa berkutip |

Setiap response analitik memuat blok `meta`:

```json
{
  "record_count": 412,
  "period_start": "2026-07-31T00:00:00",
  "period_end": "2026-08-29T23:59:59",
  "period_label": "31 Jul – 29 Agu 2026",
  "comparison_start": "2026-07-01T00:00:00",
  "comparison_end": "2026-07-30T23:59:59",
  "data_source_mode": "demo",
  "is_synthetic": true,
  "last_updated": "2026-08-29T02:10:00",
  "is_stale": false,
  "model_version": "baseline-1.0.0",
  "search_provider": "sqlite-like",
  "applied_filters": { "topics": ["gaji-benefit"] }
}
```

## 3. Dashboard

| Method | Path | Akses | Isi |
| --- | --- | --- | --- |
| GET | `/dashboard/overview` | login | KPI, deret volume, puncak, topik, sentimen per pekerjaan, heatmap, isu perhatian, pertanyaan teratas, keterbatasan |
| GET | `/dashboard/trends` | login | `granularity=daily\|weekly`, `breakdown=topic\|job_role\|sentiment\|none` |
| GET | `/dashboard/topics` | login | Ringkasan seluruh topik + `partitions` (kombinasi kategori isu × jenis pekerjaan: jumlah, porsi, pertanyaan, porsi negatif) + kata kunci terkait + pertanyaan |
| GET | `/dashboard/topics/{slug}` | login | Detail satu topik: deret, sentimen, intent, pekerjaan, ringkasan usulan |
| GET | `/dashboard/heatmap` | login | Matriks jenis pekerjaan × topik kekhawatiran |
| GET | `/dashboard/questions` | login | Post ber-intent Pertanyaan (parameter `limit`) |
| GET | `/dashboard/keywords` | login | Jaringan kata kunci terkait (parameter `limit`) |
| GET | `/dashboard/insight-suggestions` | login | Draft insight berbasis template; wajib ditinjau manusia |

## 4. Post

| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/posts` | login | `sort=relevance\|recent\|engagement`, `page`, `page_size` (5–100) |
| GET | `/posts/{post_id}` | login | Detail satu post |
| PATCH | `/posts/{post_id}/labels` | login wajib | Koreksi label manual (human-in-the-loop); nilai label divalidasi terhadap taxonomy |

Setiap post memuat `explanation`, yaitu dasar klasifikasi untuk keempat label
(`topic`, `sentiment`, `intent`, `job_role`):

```json
{
  "rule": "Kata kunci taxonomy topik \"Gaji dan Benefit\" paling banyak cocok (2 kata). ...",
  "triggers": ["gaji", "umr"],
  "corrected": false,
  "auto_rule": ""
}
```

Kata pemicu dicocokkan pada teks ternormalisasi, sehingga sebagian (mis.
ekspansi slang) tidak muncul persis pada teks asli. Saat pengguna mengoreksi
label, `corrected` menjadi `true`, `rule` menyebut label sebelumnya, dan aturan
otomatis semula disimpan di `auto_rule`. Post yang dianalisis sebelum kolom ini
ada mengembalikan objek kosong sampai analisis ulang dijalankan.

Nilai keyakinan model dikirim untuk seluruh pengguna login. Respons tidak pernah
memuat identitas personal penulis; hanya `external_post_id` dan tautan.

## 5. Query dan monitor

| Method | Path | Akses |
| --- | --- | --- |
| GET/POST | `/queries` | login wajib |
| PATCH/DELETE | `/queries/{id}` | login wajib |
| GET/POST | `/monitors` | login wajib |
| PATCH | `/monitors/{id}` | login wajib |
| POST | `/monitors/{id}/duplicate` | login wajib |

Response monitor memuat `current_count`, `previous_count`, `change_percent`,
`trend_direction`, dan `sparkline` yang dihitung ulang setiap permintaan —
bukan aliran data real-time.

## 6. Insight dan laporan

| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/insights` | login | Filter opsional `status=draft\|reviewed\|approved` |
| POST | `/insights` | login wajib | Insight baru berstatus draft bila tidak ditentukan; `approved` ditolak (403) |
| PATCH | `/insights/{id}` | login wajib | Penulis dan penyunting terakhir tidak dapat menyetujui (403); isi + `approved` dalam satu permintaan ditolak (422); edit isi insight approved mengembalikan status ke draft; `review_comment` bukan isi dan tidak diekspor |
| DELETE | `/insights/{id}` | login wajib | Insight yang pernah disetujui (`first_approved_at` terisi) tidak dapat dihapus (409) |
| GET/POST | `/reports` | login wajib | `charts` maksimal 6 kunci |
| GET | `/reports/{id}` | login | |
| GET | `/reports/{id}/preview` | login | Isi laporan tanpa mengunduh berkas |
| GET | `/reports/{id}/export?format=pdf\|csv\|posts` | login | `posts` hanya berisi Post ID, waktu, topik, pekerjaan, dan tautan |
| DELETE | `/reports/{id}` | login wajib | |

Kunci grafik yang tersedia: `volume`, `topics`, `sentiment`, `job_roles`,
`intents`. Seluruh ekspor pada mode demo memuat watermark
`DATA SINTETIS — BUKAN TEMUAN AKTUAL`.

## 7. Data dan pengaturan

| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/data/connectors` | login | Status connector dan mode data efektif |
| GET | `/data/taxonomy` | login | Topik, jenis pekerjaan (+ `job_role_codes`), intent, sentimen, bahasa, rumus engagement |
| PATCH | `/data/topics/{id}` | login wajib | Ubah nama, deskripsi, warna, kata kunci, status aktif |
| GET | `/data/keyword-presets` | login | Preset kata kunci per kategori isu (termasuk yang nonaktif) |
| POST | `/data/keyword-presets` | login wajib | `{ topic_slug, label, query_text, sort_order, is_active }` |
| PATCH/DELETE | `/data/keyword-presets/{id}` | login wajib | Ubah atau hapus preset; tercatat di audit log |
| GET | `/data/quality` | login | Cakupan analisis, porsi belum terklasifikasi, perlu ditinjau |
| POST | `/data/import` | login wajib | `multipart/form-data` berisi `file` (CSV/JSON, maks. 8 MB) |
| POST | `/data/import-public-x` | login wajib | Impor satu post X publik dari body JSON `{ "url": "https://x.com/.../status/..." }` |
| POST | `/data/fetch-live` | login wajib | Tarik post nyata via X API resmi: `query` (wajib), `days` (1–7), `max_results` (10–100) |
| POST | `/data/seed` | `ENABLE_SYSTEM_OPS=true` | `count` (100–5000), `days` (7–365), `reset` |
| POST | `/data/reanalyze` | `ENABLE_SYSTEM_OPS=true` | Jalankan ulang pipeline NLP untuk seluruh post |
| GET | `/data/runs` | login | Riwayat proses data (`limit` 1–100) |
| GET | `/data/audit` | login wajib | Audit log (`limit` 1–200) |

`/data/fetch-live` menjalankan `OfficialXApiConnector` di server lalu memasukkan
hasilnya lewat pipeline yang sama dengan impor (deduplikasi `external_post_id`,
analisis NLP, catatan `ingestion_runs`, audit `data.fetch_live`). Post yang masuk
ditandai `is_synthetic = false` dan `source = "x_api"`. Endpoint menolak dengan:

- **409** bila `X_API_BEARER_TOKEN` belum tersedia di environment server;
- **503** bila X API menolak permintaan atau query kosong.

Catatan: endpoint pencarian resmi yang dipakai (`tweets/search/recent`) hanya
menjangkau 7 hari terakhir dan maksimal 100 post per permintaan.

Kolom wajib berkas impor: `external_post_id`, `text`, `created_at_source`.
Kolom opsional: `like_count`, `repost_count`, `reply_count`, `quote_count`,
`language`, `url`. Contoh berkas: `data/synthetic/contoh_impor.csv`.

## 8. Sistem

| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/health` | – | Status database, mode data, jumlah post, versi |
| GET | `/methodology` | – | Sumber data, pengolahan, etika, keterbatasan, kesegaran |
| POST | `/usability/events` | login | Log alur pengujian (tanpa isi pencarian) |
| GET | `/usability/summary` | login wajib | Agregat durasi dan jumlah langkah per tugas |

## 9. Penanganan error

| Status | Bentuk | Contoh pesan |
| --- | --- | --- |
| 401 | `{"detail": "..."}` | Sesi berakhir — token kedaluwarsa atau tidak valid |
| 403 | `{"detail": "..."}` | Operasi sistem dinonaktifkan atau aturan workflow dilanggar |
| 404 | `{"detail": "..."}` | Entitas tidak ditemukan |
| 413 | `{"detail": "Ukuran berkas melebihi 8 MB."}` | Impor terlalu besar |
| 422 | `{"detail": "...", "errors": [{"field": "...", "message": "..."}]}` | Validasi parameter/berkas |
| 500 | `{"detail": "Terjadi kesalahan pada server. Coba muat ulang halaman."}` | Kesalahan tak tertangani |

Seluruh pesan error ditulis dalam Bahasa Indonesia dan aman ditampilkan kepada
pengguna akhir.
