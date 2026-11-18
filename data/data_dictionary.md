# Kamus Data TalentPulse

Seluruh tabel memakai primary key `id` bertipe `String(36)` berisi UUID4.
Kolom waktu disimpan sebagai UTC naive (`DateTime`).

## Nama ERD

ERD di naskah memakai nama berbahasa Indonesia. Kolom **Nama ERD** pada tiap
tabel memberi padanan untuk setiap kolom kode; nama kolom di database tidak
berubah. Kolom `id` bernama `id` di semua entitas.

- Nama tanpa tanda diambil apa adanya dari ERD (FigJam *OTW sempro*, Gambar 5a-1 dan 5a-2).
- Nama bertanda *(usulan)* belum ada di ERD dan mengikuti konvensi berikut:
  - `*_at` → `waktu_*` (`completed_at` = `waktu_selesai`)
  - `is_*` → kata sifat (`is_active` = `aktif`, `is_synthetic` = `sintetis`)
  - `*_count` dan `records_*` → `jumlah_*` (`records_failed` = `jumlah_gagal`)
  - `*_id` tetap berakhiran `_id` (`triggered_by` = `pemicu_id`)

| Tabel kode | Entitas ERD |
| --- | --- |
| `users` | PENGGUNA |
| `topics` | ISU |
| `source_queries` | KUERI_PANTAU |
| `posts` | KIRIMAN |
| `post_analysis` | LABEL |
| `keyword_presets` | PRESET_KATA_KUNCI |
| `monitors` | PANTAUAN *(usulan)* |
| `insights` | LAPORAN_INSIGHT |
| `reports` | LAPORAN_UNDUHAN |
| `ingestion_runs` | RIWAYAT_PROSES |
| `audit_logs` | LOG_AUDIT |
| `usability_events` | LOG_KEBERGUNAAN |

## users

Pengguna dashboard (bukan subjek data). Nama ERD: PENGGUNA.

| Kolom | Nama ERD | Tipe | Keterangan |
| --- | --- | --- | --- |
| `id` | `id` | String(36) | UUID |
| `name` | `nama` | String(120) | Nama tampilan |
| `email` | `email` | String(255), unik, indeks | Identitas login |
| `password_hash` | `hash_kata_sandi` *(usulan)* | String(255) | bcrypt |
| `role` | `peran` | String(20) | `admin`, `analyst`, `viewer` |
| `is_active` | `aktif` | Boolean | Akun nonaktif tidak dapat login |
| `created_at` | `waktu_dibuat` *(usulan)* | DateTime | |

## topics

Taxonomy topik percakapan; dapat dikelola admin. Nama ERD: ISU.

| Kolom | Nama ERD | Tipe | Keterangan |
| --- | --- | --- | --- |
| `slug` | `slug` *(usulan)* | String(80), unik | Contoh `gaji-benefit` |
| `name` | `nama` | String(160) | Label antarmuka |
| `description` | `deskripsi` *(usulan)* | Text | Penjelasan cakupan topik |
| `color` | `warna` *(usulan)* | String(9) | Hex; konsisten antar grafik |
| `keywords` | `kata_pemicu` | JSON (list) | Kata kunci penentu klasifikasi |
| `is_active` | `aktif` *(usulan)* | Boolean | Topik nonaktif tidak dipakai klasifikasi baru |

Sepuluh topik awal: `gaji-benefit`, `kontrak-status`, `lokasi-penempatan`,
`shift-jam-kerja`, `persyaratan-pendidikan`, `pengalaman-keahlian`,
`proses-melamar`, `keamanan-penipuan`, `pengalaman-kandidat`,
`reputasi-perusahaan`.

## source_queries

Definisi query yang dapat disimpan dan dipakai ulang. Nama ERD: KUERI_PANTAU
(bagian kata kunci dan pemilik; ambang ada di `monitors`).

| Kolom | Nama ERD | Tipe | Keterangan |
| --- | --- | --- | --- |
| `name` | `nama` *(usulan)* | String(160) | Nama query |
| `query_text` | `teks_kueri` *(usulan)* | Text | Ekspresi pencarian mentah |
| `include_keywords` | `kata_kunci` | JSON (list) | Kata kunci yang harus ada (OR) |
| `exclude_keywords` | `kata_kunci_kecuali` *(usulan)* | JSON (list) | Kata kunci yang mengecualikan |
| `job_roles`, `topics`, `sentiments`, `intents` | `filter_jenis_pekerjaan`, `filter_isu`, `filter_sentimen`, `filter_intensi` *(usulan)* | JSON (list) | Filter tersimpan |
| `owner_id` | `pemilik_id` | FK users, nullable | Pemilik |
| `is_saved`, `is_archived` | `tersimpan`, `diarsipkan` *(usulan)* | Boolean | Status penyimpanan |
| `created_at`, `updated_at` | `waktu_dibuat`, `waktu_diubah` *(usulan)* | DateTime | |

## posts

Post publik atau sintetis. Tidak menyimpan atribut sensitif maupun identitas
personal yang dapat langsung mengidentifikasi seseorang. Nama ERD: KIRIMAN.

| Kolom | Nama ERD | Tipe | Keterangan |
| --- | --- | --- | --- |
| `external_post_id` | `id_eksternal` *(usulan)* | String(80), unik, indeks | ID post pada sumber; kunci deduplikasi |
| `source` | `sumber_id` (di ERD berupa FK ke SUMBER_DATA) | String(20) | `demo`, `x_api`, `import` |
| `text` | `teks` | Text | Isi post |
| `created_at_source` | `waktu_unggah` | DateTime, indeks | Waktu publikasi di sumber |
| `language` | `bahasa` *(usulan)* | String(8) | `id`, `en` |
| `author_public_id` | `akun_hash` | String(80), nullable | HMAC-SHA256 (hex) dari username dengan kunci `AUTHOR_HASH_KEY`; username asli **tidak pernah disimpan** dan kolom ini tidak dikirim ke UI |
| `like_count`, `repost_count`, `reply_count`, `quote_count` | `jumlah_suka`, `jumlah_repost`, `jumlah_balasan`, `jumlah_kutipan` *(usulan)* | Integer | Metrik interaksi |
| `url` | `tautan` | String(400), nullable | Tautan post; URL X disimpan sebagai `https://x.com/i/status/{id}` tanpa username |
| `is_synthetic` | `sintetis` *(usulan)* | Boolean | `true` untuk data demo |
| `ingested_at` | `waktu_masuk` | DateTime | Waktu masuk sistem |
| `deleted_at` | `waktu_dihapus` *(usulan)* | DateTime, nullable, indeks | Soft delete; dikecualikan seluruh query. Post nyata yang ditandai terhapus dihapus permanen pada putaran retensi berikutnya. Retensi sendiri menghapus permanen post nyata yang tidak relevan 14 hari setelah masuk dan yang relevan tepat 90 hari setelah masuk |
| `induk_id` | `induk_id` | String(36), nullable, indeks, FK → `posts.id` (`ON DELETE SET NULL`) | Post yang dibalas, bila post ini balasan dan induknya tersimpan |
| `induk_external_id` | `induk_id_eksternal` *(usulan)* | String(80), nullable, indeks | ID post induk di X; dipakai untuk menautkan balasan yang masuk sebelum induknya |

Indeks gabungan: `ix_posts_source_created (source, created_at_source)`.

## post_analysis

Hasil pipeline NLP; satu baris per post. Nama ERD: LABEL.

| Kolom | Nama ERD | Tipe | Keterangan |
| --- | --- | --- | --- |
| `post_id` | `kiriman_id` | FK posts, unik, cascade | |
| `normalized_text` | `teks_normal` *(usulan)* | Text | Teks ternormalisasi; target pencarian |
| `sentiment_label` | `sentimen` | String(20), indeks | `Positif`, `Netral`, `Negatif`, `Tidak Yakin` |
| `sentiment_confidence` | `keyakinan_sentimen` *(usulan)* | Float | 0–1; 1.0 bila dikoreksi manusia |
| `intent_label` | `intensi` | String(40), indeks | `Pertanyaan`, `Keluhan`, `Pengalaman`, `Informasi Lowongan`, `Promosi`, `Peringatan Penipuan` |
| `intent_confidence` | `keyakinan_intensi` *(usulan)* | Float | 0–1 |
| `topic_id` | `isu_id` | FK topics, nullable, indeks | `null` = belum masuk topik |
| `job_role` | `jenis_pekerjaan` | String(60), indeks | Salah satu dari lima jenis pekerjaan naskah atau `Lainnya` |
| `relevance_score` | `skor_relevansi` *(usulan)* | Float | Relevansi terhadap konteks rekrutmen |
| `engagement_score` | `skor_keterlibatan` *(usulan)* | Float, indeks | `like×1 + repost×2 + reply×1,5 + quote×1,5` |
| `keywords` | `kata_kunci` *(usulan)* | JSON (list) | Kata kunci hasil ekstraksi |
| `explanation` | `dasar_aturan` | JSON, nullable | Dasar klasifikasi per label: `{topic\|sentiment\|intent\|job_role: {rule, triggers, corrected, auto_rule}}`. `null` untuk post yang dianalisis sebelum migration `b7c2d9e4f1a0`; isi dengan analisis ulang |
| `model_version` | `versi_model` *(usulan)* | String(40) | Contoh `baseline-1.0.0`, `baseline-1.0.0+koreksi-manual` |
| `analyzed_at` | `waktu_analisis` *(usulan)* | DateTime | |
| `needs_review` | `perlu_tinjauan` *(usulan)* | Boolean | Keyakinan rendah → perlu tinjauan manusia |
| `corrected_by` | `pengoreksi_id` *(usulan)* | FK users, nullable | Admin yang mengoreksi label |

Indeks gabungan: `ix_analysis_topic_sentiment`, `ix_analysis_role_intent`.

## keyword_presets

Kueri terpandu per kategori isu (karakteristik *starting* Ellis). Isi awal dari
`KEYWORD_PRESET_SEED` di `app/taxonomy.py`; selanjutnya dikelola admin lewat Data &
Pengaturan. Nama ERD: PRESET_KATA_KUNCI.

| Kolom | Nama ERD | Tipe | Keterangan |
| --- | --- | --- | --- |
| `id` | `id` | String(36), PK | UUID |
| `topic_id` | `isu_id` *(usulan)* | FK topics, cascade, indeks | Kategori isu pemilik preset |
| `label` | `label` *(usulan)* | String(120) | Nama yang tampil pada chip |
| `query_text` | `teks_kueri` *(usulan)* | String(300) | Kueri dengan sintaks Pencarian Post (`AND`, `OR`, `-kata`, frasa) |
| `sort_order` | `urutan` *(usulan)* | Integer | Urutan dalam satu kategori isu |
| `is_active` | `aktif` *(usulan)* | Boolean | `false` = disembunyikan dari Pencarian Post |
| `created_at` | `waktu_dibuat` *(usulan)* | DateTime | |

## monitors

Monitoring atas sebuah `source_query`. Nama ERD: PANTAUAN *(usulan)*.

| Kolom | Nama ERD | Tipe | Keterangan |
| --- | --- | --- | --- |
| `name` | `nama` *(usulan)* | String(160) | Nama monitor |
| `source_query_id` | `kueri_pantau_id` *(usulan)* | FK source_queries, cascade | Definisi filter |
| `owner_id` | `pemilik_id` | FK users, nullable | Pemilik |
| `comparison_window` | `jendela_pembanding_hari` *(usulan)* | Integer | 7, 14, atau 30 hari |
| `is_active`, `is_archived` | `aktif`, `diarsipkan` *(usulan)* | Boolean | |
| `created_at` | `waktu_dibuat` *(usulan)* | DateTime | |

Nilai `current_count`, `previous_count`, `change_percent`, `trend_direction`, dan
`sparkline` dihitung saat permintaan, tidak disimpan.

## insights

Temuan yang selalu melewati peninjauan manusia. Nama ERD: LAPORAN_INSIGHT.

| Kolom | Nama ERD | Tipe | Keterangan |
| --- | --- | --- | --- |
| `title` | `judul` | String(240) | |
| `summary` | `ringkasan` *(usulan)* | Text | Ringkasan (template atau tulisan manusia) |
| `human_note` | `catatan_peninjau` *(usulan)* | Text | Catatan peninjau; ikut tercetak pada laporan |
| `evidence_filters` | `filter_bukti` *(usulan)* | JSON (dict) | Filter yang menghasilkan temuan |
| `metric_snapshot` | `cuplikan_metrik` *(usulan)* | JSON (dict) | Angka pendukung saat insight dibuat |
| `created_by` | `penyusun_id` | FK users, nullable | |
| `human_status` | `status` | String(20) | `draft` → `reviewed` → `approved` |
| `is_synthetic_data` | `data_sintetis` *(usulan)* | Boolean | `true` bila dibuat saat mode demo |
| `created_at`, `updated_at` | `waktu_dibuat`, `waktu_diubah` *(`waktu_diubah` usulan)* | DateTime | |

## reports

Laporan yang menggabungkan insight dan grafik agregat. Nama ERD: LAPORAN_UNDUHAN.

| Kolom | Nama ERD | Tipe | Keterangan |
| --- | --- | --- | --- |
| `title` | `judul` *(usulan)* | String(240) | |
| `period_start`, `period_end` | `awal_periode`, `akhir_periode` *(usulan)* | DateTime | Periode laporan |
| `query_snapshot` | `cuplikan_kueri` *(usulan)* | JSON (dict) | Filter saat laporan disusun |
| `insight_ids` | `daftar_insight_id` *(usulan)* | JSON (list) | Insight yang disertakan |
| `charts` | `grafik` *(usulan)* | JSON (list) | `volume`, `topics`, `sentiment`, `job_roles`, `intents` (maks. 6) |
| `notes` | `catatan` *(usulan)* | Text | Catatan laporan |
| `created_by` | `penyusun_id` *(usulan)* | FK users, nullable | |
| `generated_at` | `waktu_dihasilkan` *(usulan)* | DateTime | |

## ingestion_runs

Riwayat proses data (impor dan analisis ulang) yang ditampilkan sebagai "Log
proses data". Nama ERD: RIWAYAT_PROSES.

| Kolom | Nama ERD | Tipe | Keterangan |
| --- | --- | --- | --- |
| `source` | `sumber_id` *(usulan)* | String(30) | `demo`, `import`, `reanalysis`, `x_api` |
| `started_at`, `completed_at` | `waktu_mulai`, `waktu_selesai` *(usulan)* | DateTime | |
| `records_received` | `jumlah_diterima` *(usulan)* | Integer | Baris diterima |
| `records_processed` | `jumlah_diproses` *(usulan)* | Integer | Baris berhasil |
| `records_failed` | `jumlah_gagal` *(usulan)* | Integer | Baris gagal validasi |
| `status` | `status` *(usulan)* | String(20) | `running`, `success`, `partial`, `failed` |
| `error_summary` | `ringkasan_galat` *(usulan)* | Text | Ringkasan kesalahan yang mudah dibaca |
| `triggered_by` | `pemicu_id` *(usulan)* | FK users, nullable | |

## audit_logs

Jejak perubahan untuk kepatuhan. Nama ERD: LOG_AUDIT.

| Kolom | Nama ERD | Tipe | Keterangan |
| --- | --- | --- | --- |
| `actor_id` | `pengguna_id` | FK users, nullable | |
| `actor_email` | `email_pelaku` *(usulan)* | String(255) | Disimpan terpisah agar tetap terbaca setelah reset |
| `action` | `aksi` | String(80), indeks | `data.import`, `data.seed`, `data.reanalyze`, `taxonomy.update`, `label.correct`, `insight.*`, `report.*` |
| `entity`, `entity_id` | `objek`, `objek_id` *(`objek_id` usulan)* | String(80) | Objek yang terpengaruh |
| `detail` | `rincian` *(usulan)* | JSON (dict) | Ringkasan perubahan |
| `created_at` | `waktu` | DateTime, indeks | |

## usability_events

Log pengujian usability yang privacy-preserving. Nama ERD: LOG_KEBERGUNAAN.

| Kolom | Nama ERD | Tipe | Keterangan |
| --- | --- | --- | --- |
| `session_key` | `kunci_sesi` *(usulan)* | String(64), indeks | Kunci sesi anonim |
| `task_code` | `kode_tugas` *(usulan)* | String(40) | Kode tugas pengujian |
| `event_type` | `jenis_peristiwa` *(usulan)* | String(40) | Contoh `task_start`, `task_complete` |
| `step_count` | `jumlah_langkah` *(usulan)* | Integer | Jumlah langkah navigasi |
| `duration_ms` | `durasi_ms` *(usulan)* | Integer | Durasi tugas |
| `filter_keys` | `nama_filter` *(usulan)* | JSON (list) | **Nama** filter yang dipakai, bukan nilainya |
| `created_at` | `waktu_dibuat` *(usulan)* | DateTime | |

## Enumerasi

| Enumerasi | Nilai |
| --- | --- |
| Role | `admin`, `analyst`, `viewer` |
| Sentimen | `Positif`, `Netral`, `Negatif`, `Tidak Yakin` |
| Intent | `Pertanyaan`, `Keluhan`, `Pengalaman`, `Informasi Lowongan`, `Promosi`, `Peringatan Penipuan` |
| Jenis pekerjaan | `SPG/SPB` (`spg_spb`), `Staf Gudang` (`staf_gudang`), `Kasir` (`kasir`), `Administrasi` (`administrasi`), `Pengemudi` (`pengemudi`), `Lainnya`. Nilai yang disimpan adalah label; kode hanya rujukan naskah 1.3 butir 2 |
| Status insight | `draft`, `reviewed`, `approved` |
| Status ingestion | `running`, `success`, `partial`, `failed` |
| Bahasa | `id`, `en` |

## Format impor

Kolom wajib: `external_post_id`, `text`, `created_at_source`.
Kolom opsional: `like_count`, `repost_count`, `reply_count`, `quote_count`,
`language`, `url`.

Format tanggal yang dikenali: ISO 8601 (`2026-08-29T10:15:00`), `YYYY-MM-DD HH:MM:SS`,
`YYYY-MM-DD`, dan `DD/MM/YYYY`. Baris dengan `external_post_id` yang sudah ada
akan dilewati, bukan digandakan. Contoh berkas: `data/synthetic/contoh_impor.csv`.
