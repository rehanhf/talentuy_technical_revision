# TalentPulse — Berkas Konteks Proyek

> Dokumen konteks lengkap. Disusun dari pembacaan penuh atas `TalentPulse_Full_Project_Prompt.md`, `README.md`, `CLAUDE.md`, sembilan berkas `docs/`, kamus data, kode `apps/api` dan `apps/web`, riwayat git, serta query langsung ke `talentpulse.db`.
>
> **Angka apa pun di dokumen ini yang berbeda dari klaim README berasal dari pemeriksaan langsung, bukan dari dokumen.**

| | |
|---|---|
| **Lokasi** | `Downloads/PROJECTS/L7XCY/TALENTUY` |
| **Repo** | `github.com/farrelrchmd/talentuy` — branch `main` |
| **Commit** | `d6881f6` — "Commit awal: prototipe TalentPulse (MVP lengkap)", 1 Sep 2026 |
| **Konteks** | Prototipe tugas akhir berbasis karya |
| **Mitra** | PT Siprama Cakrawala |
| **Ditelaah** | 4 September 2026 |

**Angka kunci:** 8 halaman + login · 46 endpoint · 11 tabel · 1.400 post (semuanya sintetis) · 124 tes otomatis lolos · 32 tangkapan layar · **2 teori yang benar-benar dipakai** · **0 peserta usability testing**

---

## 1. Identitas dan posisi produk

**Tagline:** "Dengar percakapan kandidat. Perjelas komunikasi rekrutmen."

**Definisi satu kalimat** (verbatim, `TalentPulse_Full_Project_Prompt.md:11`):

> "sebuah dashboard web internal yang membantu tim Recruitment/HR PT Siprama Cakrawala mengeksplorasi percakapan publik pencari kerja di media sosial X untuk mendukung komunikasi rekrutmen yang lebih jelas, relevan, dan responsif."

**Judul TA sementara di dalam repo** (`TalentPulse_Full_Project_Prompt.md:40`):

> "Perancangan TalentPulse sebagai Dashboard Interaktif Eksplorasi Percakapan Pencari Kerja pada Media Sosial X untuk Mendukung Komunikasi Rekrutmen PT Siprama Cakrawala"

**Batas produk** (spec §3, verbatim):

> "TalentPulse tidak boleh mengklaim dapat menentukan keputusan penerimaan kandidat. Produk ini hanya menjadi **media informasi pendukung komunikasi rekrutmen**, bukan sistem seleksi, profiling, scoring kandidat, atau pengambilan keputusan ketenagakerjaan otomatis."

### Pihak-pihak

| Peran | Keterangan |
|---|---|
| **Mitra** | PT Siprama Cakrawala — penyedia dan pengelola tenaga alih daya untuk sales promotion, merchandiser, staf gudang, admin, operator, keamanan, cleaning service, driver. Disebut 9× di repo. Identitasnya sengaja diperlakukan sebagai konfigurasi: `companyName: "PT Siprama Cakrawala (placeholder)"`; logo resmi belum ditampilkan sampai aset dan persetujuan tersedia. |
| **Pengguna utama** | Staf Recruitment, HR, Recruitment Marketing, Employer Branding, Corporate Communication yang mendukung rekrutmen |
| **Persona** | **Rani Prameswari**, Recruitment Communication Officer. Tujuan: menemukan isu dan pertanyaan pencari kerja untuk menyusun komunikasi lowongan dan konten edukasi. Kendala: informasi tersebar, pencarian manual lama, sulit membandingkan tren. Kemampuan teknis menengah, bukan data scientist. Perangkat: laptop kantor 1366×768 dan 1920×1080 |
| **Subjek data** | Pengguna X yang membuat post publik — "**bukan pengguna dashboard** dan tidak boleh diprofilkan, diberi skor kelayakan kerja, atau diklasifikasikan berdasarkan atribut sensitif" |

### Pertanyaan yang mendefinisikan keberhasilan (spec §31)

> "Topik dan pertanyaan apa yang paling sering dibicarakan pencari kerja mengenai pekerjaan gudang selama 30 hari terakhir, bagaimana perubahannya, dan post mana yang memberikan konteks paling relevan?"

### Empat masalah yang dijawab

Spec menyebutnya persis sebagai "**hipotesis masalah yang perlu divalidasi melalui wawancara mitra**". Wawancara tersebut belum ada dokumennya di repo.

1. Percakapan pencari kerja mengenai lowongan, proses melamar, kontrak, gaji, lokasi penempatan, sistem shift, dan penipuan lowongan tersebar di media sosial.
2. Tim rekrutmen membutuhkan waktu untuk menemukan isu dan pertanyaan yang relevan secara manual.
3. Informasi yang tersebar sulit dibandingkan berdasarkan waktu, jenis pekerjaan, sentimen, atau kategori kekhawatiran.
4. Tim rekrutmen belum memiliki tampilan terpadu untuk mengubah percakapan publik menjadi bahan FAQ, konten edukasi, dan perbaikan komunikasi lowongan.

### Sembilan tujuan produk (spec §4)

Mencari percakapan publik berdasarkan kata kunci rekrutmen · melihat perubahan volume dari waktu ke waktu · mengidentifikasi topik/pertanyaan/kekhawatiran yang sering muncul · membandingkan berdasarkan jenis pekerjaan, topik, periode, sentimen · menemukan post paling relevan sebagai konteks, bukan dasar profiling · menyimpan query monitoring · menghasilkan ringkasan insight yang dapat ditinjau manusia · mengekspor laporan agregat · mengurangi waktu dan jumlah langkah pencarian dibanding pencarian manual.

---

## 2. Ruang lingkup

### Sudah jadi — MVP wajib (spec §7)

Login demo & role dasar · global search & query builder · Dashboard Overview · Trend Analysis · Topic Explorer · Post Explorer · Related Keywords · Saved Monitoring · Insight Report · Data Import & pengaturan sumber data · dataset demo sintetis · responsive layout · seluruh state (empty/loading/error/no-result) · README + dokumentasi setup + pengujian dasar.

### Ditunda — pasca-MVP

| Fitur | Catatan implementasi |
|---|---|
| Semantic search | "Tambah `SearchProvider` berbasis embedding + pgvector; antarmuka tidak berubah" |
| Alert terjadwal | "Worker terjadwal membandingkan monitor lalu mengirim notifikasi" |
| Perbandingan kompetitor | "Perlu kajian etika dan dasar hukum tambahan" |
| Ringkasan dengan LLM | "Ganti `nlp/summarizer.py`; status draft dan peninjauan manusia tetap wajib" |
| Single sign-on | "Ganti `security.py` dengan OIDC; hierarki role dipertahankan" |
| Notifikasi email/Telegram | "Mengikuti alert terjadwal" |
| Live streaming data | "Perlu langganan X API yang mendukung stream" |

### Tidak akan pernah dikerjakan

`docs/features.md` §3, verbatim — "Tidak akan dikerjakan karena bertentangan dengan posisi etis produk":

- profiling atau skor kelayakan kerja kandidat
- inferensi atribut sensitif (agama, suku, gender, kesehatan, politik, orientasi seksual, kondisi ekonomi)
- pencarian berbasis identitas personal
- ekspor massal data mentah post
- pengambilan keputusan ketenagakerjaan otomatis

Ditambah larangan teknis: **tanpa scraping** ("Jangan menggunakan browser scraping atau library yang melanggar kebijakan platform"), tanpa klaim afiliasi X, tanpa logo X sebagai identitas produk.

---

## 3. Antarmuka — delapan halaman, disusun menurut pertanyaan kerja

Keputusan arsitektur informasi yang paling patut dibela di sidang (`docs/information_architecture.md` §1, verbatim):

> "Informasi disusun menurut **pertanyaan kerja** tim Recruitment/HR, bukan menurut struktur tabel basis data."

| Rute | Pertanyaan pengguna | Isi utama |
|---|---|---|
| `/ringkasan` | "Apa yang sedang ramai dibicarakan?" | 6 KPI, volume harian + puncak, topik teratas, sentimen per pekerjaan, heatmap kekhawatiran, isu perlu perhatian, pertanyaan teratas |
| `/tren` | "Apakah naik atau turun dibanding periode lalu?" | Granularitas harian/mingguan, mode indeks, perbandingan periode sebelumnya, breakdown topik/pekerjaan/sentimen, anotasi lonjakan |
| `/topik` | "Isu apa saja yang muncul dan seputar apa?" | Kartu topik dengan perubahan periode, drill-down detail, kata kunci terkait, pertanyaan per topik |
| `/post` | "Apa yang sebenarnya mereka tulis?" | Pencarian boolean, pengurutan relevansi/terbaru/engagement, paginasi, penyorotan istilah, panel detail post |
| `/monitoring` | "Bagaimana isu ini berkembang minggu depan?" | Daftar monitor, tren 7 hari, perubahan antar periode, buka di dashboard, duplikat, arsip |
| `/laporan` | "Apa yang saya laporkan ke atasan?" | Saran insight dari data, alur draft → ditinjau → disetujui, catatan peninjau, penyusun laporan, pratinjau, ekspor PDF/CSV/Post ID |
| `/data` | "Dari mana datanya?" | Status connector, kualitas data, impor CSV/JSON, analisis ulang, bangkitkan data demo, taxonomy topik, kamus istilah, log proses, audit log |
| `/metodologi` | "Seberapa bisa dipercaya?" | Sumber dan pengolahan data, etika, keterbatasan, cara membaca dashboard, pemetaan Ellis dan Information Foraging, ringkasan usability |

Halaman `/masuk` (login, publik). Total halaman dashboard 4.333 LOC; `apps/web/src` non-test 8.588 LOC. `next build` menghasilkan 11 rute (8 dashboard + login + error + not-found + root redirect).

**Enam KPI Overview:** Total Post · Perubahan Volume · Topik Aktif · Sentimen Dominan · Pertanyaan Terdeteksi · Jenis Pekerjaan Teratas.

### Berlaku di semua halaman

- Pencarian global **`Ctrl/⌘ + K`** dengan preset topik dan lompatan antar halaman
- Operator pencarian: `AND`, `OR`, `-kata` (exclude), frasa berkutip
- Sembilan filter global: rentang tanggal, query tersimpan, jenis pekerjaan, topik, sentimen, kategori intent, rentang engagement, bahasa, kata kunci
- Cross-filter: klik grafik menambah filter, klik ulang melepasnya; chip filter aktif dilepas satu per satu; "Hapus semua filter"
- State filter tersimpan pada URL — tombol back browser tetap bermakna; hanya nilai non-default ditulis agar tautannya pendek
- Debounce 280 ms sebelum request API
- Badge `DATA DEMO` / `DATA LIVE` + baris meta: waktu pembaruan, penanda data usang, versi model, provider pencarian
- Setiap grafik punya alternatif tabel data (`ChartWithTable`) dan ringkasan `sr-only`
- State lengkap: loading skeleton, kosong, tanpa hasil, error + tombol coba lagi, izin ditolak, data usang, connector nonaktif, konfirmasi aksi destruktif, toast

**Aturan pelabelan yang layak dikutip di naskah:** "Angka yang tidak dapat dibandingkan ditulis **'Tidak dapat dibandingkan'**, bukan 0%, agar tidak menimbulkan kesimpulan palsu."

**Pencarian berbasis identitas personal tidak disediakan.**

### Peran dan akses

Hierarki `viewer < analyst < admin`. JWT berlaku 12 jam. Nilai keyakinan model hanya dikirim untuk role analyst dan admin. Aksi di luar hak akses menampilkan komponen "Akses dibatasi", bukan halaman kosong.

| Peran | Hak | Akun demo |
|---|---|---|
| **Admin** | Kelola data source; import & re-run analysis; kelola taxonomy topik; koreksi label; kelola pengguna; lihat audit log | `rani@talentpulse.local` — Rani Prameswari |
| **Analyst** | Seluruh dashboard; buat query, monitor, insight, report; hanya boleh menyunting insight miliknya sendiri | `dimas@talentpulse.local` — Dimas Anugrah |
| **Viewer** | Baca dashboard & laporan termasuk ekspor; tidak dapat mengubah data atau taxonomy | `sinta@talentpulse.local` — Sinta Larasati |

### Tiga alur pengguna terdokumentasi

- **Flow A** — Overview → lonjakan grafik → klik puncak → topik dominan → post pertanyaan teratas → simpan insight draft
- **Flow B** — filter "Staf Gudang" → Analisis Tren bandingkan dua periode → Eksplorasi Topik komposisi keluhan → laporan
- **Flow C** — simpan query "Penipuan Lowongan" → Monitoring → baca perubahan 7 hari → "Buka di dashboard"

---

## 4. Model data dan isi basis data aktual

11 tabel domain + `alembic_version`. PK semua `String(36)` UUID4, waktu UTC naive. Skema di `apps/api/app/models.py`, migrasi `e41ab7dc6ea3_initial_schema.py`.

Jumlah baris dari query langsung ke `apps/api/talentpulse.db`:

| Tabel | Baris | Isi |
|---|---:|---|
| `posts` | **1.400** | Post mentah. Kunci dedup `external_post_id`; `author_public_id` ada tapi **tidak pernah ditampilkan**; `deleted_at` soft delete yang dikecualikan semua query |
| `post_analysis` | **1.400** | Hasil NLP 1:1: sentimen + keyakinan, intent + keyakinan, topik, jenis pekerjaan, skor relevansi, skor engagement, kata kunci, `needs_review`, `model_version`, `corrected_by` |
| `topics` | 10 | Taxonomy: slug, nama, deskripsi, warna hex, daftar kata kunci |
| `source_queries` | 5 | Query tersimpan dengan include/exclude keywords dan filter tersimpan |
| `monitors` | 3 | monitoring; angka perubahan **dihitung saat request, tidak disimpan** |
| `users` | 3 | Tiga akun demo |
| `ingestion_runs` | 1 | `demo / success / 1400 diterima / 1400 diproses` |
| `insights` | **0** | Alur `draft → reviewed → approved`, flag `is_synthetic_data` |
| `reports` | **0** | Snapshot query, daftar insight, maks 6 grafik |
| `audit_logs` | **0** | `actor_email` disimpan terpisah agar tetap terbaca setelah reset |
| `usability_events` | **0** | `session_key` anonim, `task_code`, `step_count`, `duration_ms`, `filter_keys` (**nama** filter, bukan nilainya) |

### Isi korpus demo

Dihitung ulang 20 Okt 2026 dari `python -m app.seed --reset` setelah taxonomy
berganti ke lima jenis pekerjaan naskah. Rentang tanggal mengikuti hari seed
dijalankan, jadi angka akan bergeser sedikit pada seed berikutnya.

| Dimensi | Distribusi aktual |
|---|---|
| Rentang | 23 Jul 2026 – 20 Okt 2026 (~90 hari) |
| Sumber | 100% `demo`, `is_synthetic = 1` untuk semua 1.400 |
| Bahasa | id 1.376 · en 24 |
| Sentimen | Netral 675 · Negatif 394 · Positif 269 · Tidak Yakin 62 |
| Intent | Pertanyaan 860 · Informasi Lowongan 357 · Pengalaman 70 · Peringatan Penipuan 67 · Keluhan 36 · Promosi 10 |
| Jenis pekerjaan | Staf Gudang 386 · Kasir 248 · SPG/SPB 245 · Pengemudi 197 · Administrasi 196 · Lainnya 128 |
| Perlu ditinjau | 429 dari 1.400 — **30,6%** |
| Belum masuk topik | 67 post |
| Versi model | Seluruhnya `baseline-1.0.0` — belum ada koreksi manual |

**Sepuluh topik:** gaji-benefit · kontrak-status · lokasi-penempatan · shift-jam-kerja · persyaratan-pendidikan · pengalaman-keahlian · proses-melamar · keamanan-penipuan · pengalaman-kandidat · reputasi-perusahaan

**Lima query tersimpan:** Kerja Outsourcing (`outsourcing OR alih daya OR yayasan penyalur`) · Penipuan Lowongan (`penipuan OR loker palsu OR pungli`) · Pertanyaan Staf Gudang (`gudang`) · Gaji dan Lembur (`gaji OR lembur OR umr`) · Sistem Shift (`shift OR jam kerja`)

**Tiga monitor:** Pantau Penipuan Lowongan (7 hari) · Pantau Gaji dan Lembur (14) · Pantau Sistem Shift (7)

**Enumerasi resmi:** Role `admin/analyst/viewer` · Sentimen `Positif/Netral/Negatif/Tidak Yakin` · Intent `Pertanyaan/Keluhan/Pengalaman/Informasi Lowongan/Promosi/Peringatan Penipuan` · Status insight `draft/reviewed/approved` · Status ingestion `running/success/partial/failed` · Bahasa `id/en`

> **Angka yang bercerita:** 893 dari 1.400 post (**63,8%**) berlabel intent "Pertanyaan", jauh di atas Keluhan (40) dan Pengalaman (61). Kalau data nyata menunjukkan pola yang sama, itu bukti langsung untuk premis produk: iklan lowongan belum menjawab apa yang orang perlu tahu.

---

## 5. Pipeline data

### Tiga connector, satu pipeline

```
SocialDataConnector
├── MockXConnector        # default, selalu tersedia — generator sintetis
├── CsvImportConnector    # wajib — impor CSV/JSON
└── OfficialXApiConnector # opsional — hanya aktif bila X_API_BEARER_TOKEN ada
```

Semua jalur melewati urutan yang sama: **dedup `external_post_id` → analisis NLP → catat `ingestion_runs` → audit log**.

**MockXConnector** — 74 template kalimat berbentuk `(topic_slug, intent, teks dengan placeholder)`, misalnya `("gaji-benefit", "Pertanyaan", "min kalau {role} di {loc} gajinya udah UMR belum ya?")`. Placeholder diisi dari frasa peran gaul ("SPG", "helper gudang", "checker gudang", "picker", "satpam", "office boy", "sopir box", "SPV area"), 15 lokasi (Cikarang, Bekasi, Tangerang, Karawang, Surabaya…), dan istilah vendor ("vendor penyalur", "perusahaan outsourcing", "yayasan penyalur", "agency"). Reproducible via `SEED_RANDOM_STATE=20260828`. Perintah: `python -m app.seed --reset [--count N --days D]`.

**CsvImportConnector** — `POST /data/import` (admin, multipart, maks 8 MB). Kolom wajib `external_post_id`, `text`, `created_at_source`; opsional `like_count`, `repost_count`, `reply_count`, `quote_count`, `language`, `url`. Format tanggal: ISO 8601, `YYYY-MM-DD HH:MM:SS`, `YYYY-MM-DD`, `DD/MM/YYYY`. **Baris dengan ID yang sudah ada dilewati, bukan digandakan.**

**OfficialXApiConnector** — `POST /data/fetch-live?query=…&days=1-7&max_results=10-100` (admin) memanggil `https://api.x.com/2/tweets/search/recent`. Menolak **409** bila token kosong, **503** bila X API menolak. Batasan dinyatakan eksplisit: "hanya menjangkau **7 hari terakhir**, maksimal 100 post per permintaan, dan memerlukan langganan X API berbayar." **Belum pernah dijalankan** — token kosong, 0 post `x_api`.

### NLP — jalan sungguhan, tapi bukan machine learning

Versi model `baseline-1.0.0`. Header berkas (`apps/api/app/nlp/baseline.py:1`, verbatim):

> "Implementasi baseline: rule + leksikon, deterministik, tanpa unduhan model. Baseline ini sengaja transparan agar hasil label dapat dijelaskan kepada pengguna dan dikoreksi manual oleh admin (human-in-the-loop)."

Lima tahap:

1. **Normalisasi** — lowercase, hapus URL/mention, peta slang ~40 entri (`yg→yang`, `ga/gak/nggak/gk/tdk→tidak`, `loker→lowongan kerja`, `ots→outsourcing`, `sif→shift`, `gw/gue→saya`)
2. **Topik** — pencocokan kata kunci taxonomy, skor tertinggi menang, tanpa kecocokan → `null`
3. **Sentimen** — leksikon positif/negatif berbobot (`"alhamdulillah": 1.4`, `"diterima": 1.3`, `"lolos": 1.3`) dengan penanganan negasi; selisih di bawah `SENTIMENT_MIN_CONFIDENCE = 0.45` → label **"Tidak Yakin"** + `needs_review = true`
4. **Intent** — aturan pola: tanda tanya, kata kerja keluhan, penanda promosi, penanda penipuan
5. **Kata kunci** — ekstraksi frasa untuk jaringan kata kunci

Koreksi admin menghasilkan `model_version` bersuffiks `+koreksi-manual` dan confidence 1.0 — jejak human-in-the-loop terbaca di data.

**Insight summarizer** (`TemplateInsightSummarizer`, versi `template-1.0.0`) — template murni, bukan LLM:

> `"Topik {topic} mencakup {share}% percakapan pada periode {period}, {direction} {change}% dibandingkan periode sebelumnya. Pertanyaan yang sering muncul berkaitan dengan {keywords}."`

`direction_word()`: `>1` → "naik", `<-1` → "turun", di antaranya → "relatif stabil", `None` → "belum dapat dibandingkan".

### Rumus analitik

| Besaran | Rumus |
|---|---|
| Skor engagement | `like×1 + repost×2 + reply×1,5 + quote×1,5` (bobot dikonfigurasi di `config.py`) |
| Perubahan periode | `(sekarang − sebelumnya) / sebelumnya × 100` — **`null` bila pembanding nol**, ditulis "Tidak dapat dibandingkan" |
| Deteksi puncak | Moving average 7 hari + z-score |
| Relevansi | `text_rank × 0,6 + relevance_score × 0,4`. Komentar kode: "Relevansi dasar: kekuatan sinyal tekstual, bukan popularitas akun." Dijaga tes `test_relevance_not_dominated_by_engagement` |
| Skor perhatian | Volume + momentum kenaikan + porsi sentimen negatif |
| Indeks tren | Titik pertama non-nol dinormalisasi jadi 100 |
| Ambang "Topik Aktif" | `MIN_TOPIC_POSTS = 5` |

---

## 6. Arsitektur dan stack

Tiga proses: Next.js (browser) ⇄ HTTP/JSON + JWT Bearer ⇄ FastAPI ⇄ SQL ⇄ PostgreSQL/SQLite.

**Backend** — `fastapi 0.115.6` · `uvicorn 0.34.0` · `sqlalchemy 2.0.36` · `alembic 1.14.0` · `pydantic 2.10.4` · `psycopg 3.2.3` · `PyJWT 2.10.1` · `bcrypt 4.2.1` · `reportlab 4.2.5` · `pytest 8.3.4` · Python 3.12. **8 router, 46 endpoint, 2.820 LOC.**

**Frontend** — `next 15.1.3` (App Router) · `react 19.0.0` · `@tanstack/react-query 5.62.7` · `recharts 2.15.0` · `lucide-react 0.469.0` · `tailwindcss 3.4.17` · `typescript 5.7.2` strict · `vitest 2.1.8` · `@playwright/test 1.49.1`. Node 20+. **8.588 LOC.** Seluruh halaman dashboard adalah client component ("data bersifat privat per pengguna, tidak ada rendering publik").

**Infrastruktur** — `docker-compose.yml` 3 service: `db` (postgres:16-alpine + healthcheck + volume), `backend`, `frontend`. Port 5432/8000/3000, semua bisa di-override.

**Peta backend:** `main.py` (93 LOC) · `config.py` (61) · `models.py` (232) · `filters.py` (213, `FilterSet` — "satu sumber kebenaran untuk seluruh query analitik") · `analytics.py` (467) · `meta.py` (32) · `ingest.py` (143) · `reporting.py` (222) · `security.py` (40) + `deps.py` (77) · `schemas.py` (292) · `seed.py` (234) · `taxonomy.py` (150) · `nlp/` (449) · `search/` · `connectors/`.

**Alur permintaan analitik:** frontend kirim parameter filter → `filter_params` merakit `FilterSet` + `parse_query` mengurai operator → `apply_saved_query` menggabungkan filter tersimpan bila `query_id` dikirim → fungsi `analytics.py` menyusun query SQLAlchemy dengan filter yang sama → `build_meta` melampirkan metadata.

**Setiap respons analitik memuat blok `meta`:** `record_count`, `period_start/end`, `period_label`, `comparison_start/end`, `data_source_mode`, `is_synthetic`, `last_updated`, `is_stale`, `model_version`, `search_provider`, `applied_filters`.

**Pencarian:** `SearchProvider` abstrak — PostgreSQL memakai `to_tsvector`/`plainto_tsquery` + `ts_rank` + pg_trgm; SQLite memakai LIKE. Nama provider aktif ditampilkan di UI.

**Error handling** semuanya Bahasa Indonesia: 401 sesi berakhir · 403 role tidak cukup · 404 · 413 "Ukuran berkas melebihi 8 MB." · 422 dengan array `errors[]` per field · 500 "Terjadi kesalahan pada server. Coba muat ulang halaman."

### Lima keputusan teknis terdokumentasi

| Keputusan | Alasan |
|---|---|
| SQLite fallback | "Proyek tetap bisa dijalankan penguji tanpa Docker" |
| NLP leksikon | "Dapat dijelaskan, deterministik, tanpa biaya model eksternal" |
| Filter pada URL | "Mendukung berbagi tampilan dan tahap *Monitoring* model Ellis" |
| Ekspor post-level dibatasi | "Hanya Post ID dan tautan, sesuai batas etika bagian 18" |
| Alembic + `create_all` saat startup | "Migration untuk produksi, `create_all` menjaga demo tetap mudah" |

---

## 7. Design system

**Arah visual (spec §12):** "gaya **modern HR intelligence platform**: profesional, tenang, data-rich, tetapi tidak terasa seperti template admin generik. Prioritaskan hierarchy, whitespace, keterbacaan angka, dan interaksi eksplorasi."

**Huruf:** Inter. `text-base` 14px · `text-sm` 13px · `text-xs` 12px · judul halaman 20px semibold · judul kartu 15px semibold · angka KPI 24–28px semibold dengan `font-variant-numeric: tabular-nums`.

**Palet — 14 token, ditulis sebagai kanal RGB** (bukan hex) agar modifier opacity Tailwind seperti `bg-warning/10` bekerja:

| Token | Hex | Pemakaian |
|---|---|---|
| `--tp-canvas` | `#f6f8fc` | Latar aplikasi |
| `--tp-surface` | `#ffffff` | Kartu, panel, drawer |
| `--tp-surface-muted` | `#f9fafb` | Baris tabel, kutipan |
| `--tp-sidebar` | `#0b1220` | Sidebar, tooltip, overlay |
| `--tp-sidebar-hover` | `#16203a` | Hover sidebar |
| `--tp-primary` | `#2563eb` | Aksi utama, tautan, seri utama |
| `--tp-primary-soft` | `#eef4ff` | Chip aktif, badge |
| `--tp-primary-strong` | `#1d4ed8` | Hover tombol utama |
| `--tp-secondary` | `#06b6d4` | Seri pembanding |
| `--tp-text` | `#111827` | Teks utama |
| `--tp-text-muted` | `#667085` | Teks sekunder, sumbu |
| `--tp-border` | `#e4e7ec` | Garis, pemisah |
| `--tp-positive` | `#16a34a` | Sentimen positif |
| `--tp-warning` | `#f59e0b` | Data demo, "Tidak Yakin", lonjakan |
| `--tp-negative` | `#dc2626` | Sentimen negatif, destruktif |
| `--tp-neutral` | `#64748b` | Sentimen netral |

**Prinsip khas:** "Sentimen tidak pernah dibedakan hanya lewat warna: setiap badge memuat teks label dan simbol (▲ ● ▼ ?)." · kontras teks ≥ 4,5:1 · warna topik disimpan per topik di basis data agar konsisten antar grafik · angka format Indonesia (`1.245`, persen 1 desimal, koma desimal).

**Spacing:** grid gap 12–16px · padding kartu 20/16px · `rounded-card` 14px · sidebar 236px (68px diciutkan) · panel filter 268px · konten maks **1440px**.

**Breakpoint:** <768 satu kolom (sidebar + filter jadi drawer) · 768–1279 dua kolom · ≥1280 panel filter menetap · ≥1536 konten dibatasi 1440px. Target utama **1366×768 dan 1920×1080**. Dark mode tidak wajib untuk MVP.

**Aksesibilitas:** target WCAG 2.1 AA · fokus outline 2px offset 2px · "Lewati ke konten utama" · drawer/dialog focus trap + Escape · setiap grafik punya tabel alternatif + ringkasan `sr-only` · ikon dekoratif `aria-hidden`, tombol ikon `aria-label` · status dinamis `role="status"` / `aria-live="polite"`.

---

## 8. Etika dan aturan legal

**Posisi produk** (`docs/ethics.md` §1, verbatim):

> "TalentPulse adalah **media informasi pendukung komunikasi rekrutmen**. Produk ini bukan sistem seleksi, bukan alat penilaian kandidat, dan tidak menghasilkan rekomendasi menerima atau menolak seseorang.
> Subjek data adalah pengguna X yang membuat post publik. Mereka bukan pengguna dashboard, tidak diprofilkan, dan tidak diberi skor apa pun."

### Dua belas aturan mengikat dan wujudnya di produk

| # | Aturan | Wujud teknis |
|---|---|---|
| 1 | Hanya data publik jalur resmi atau sintetis | MockXConnector + OfficialXConnector; **tidak ada scraping** |
| 2 | Tidak profiling kandidat | Tidak ada halaman/endpoint per individu |
| 3 | Tidak inferensi atribut sensitif | "Taxonomy hanya memuat topik pekerjaan; tidak ada label agama, suku, gender, kesehatan, politik, orientasi seksual, atau kondisi ekonomi" |
| 4 | Bukan dasar keputusan ketenagakerjaan | Disclaimer di sidebar, Metodologi, setiap laporan |
| 5 | Tidak ada pencarian berbasis identitas | "Pencarian hanya menyentuh teks ternormalisasi; kolom author tidak dapat difilter" |
| 6 | Minimalkan identitas | "Hanya `external_post_id` dan tautan post; `author_public_id` tidak ditampilkan" |
| 7 | Hormati penghapusan post | Kolom `deleted_at`, dikecualikan seluruh query |
| 8 | Batasi ekspor mentah | Ekspor post-level hanya Post ID, waktu, topik, pekerjaan, tautan |
| 9 | Tampilkan sumber/periode/metode/keterbatasan | Blok `meta` + halaman Metodologi |
| 10 | Tidak mengklaim afiliasi X | Tidak ada logo/nama X sebagai partner |
| 11 | Audit log | `audit_logs` mencatat impor, reanalisis, taxonomy, koreksi label, insight, ekspor |
| 12 | Credential hanya di server | "Tidak ada variabel `NEXT_PUBLIC_*` berisi rahasia" |

### Penanda data sintetis — empat tempat sekaligus

Badge `DATA DEMO` di top bar · kalimat pengingat di sidebar · watermark `DATA SINTETIS — BUKAN TEMUAN AKTUAL` pada pratinjau dan ekspor · flag `is_synthetic_data` pada setiap insight yang dibuat saat mode demo.

### Human-in-the-loop

> "Ringkasan otomatis berhenti pada status **draft** dan diberi label 'Rekomendasi untuk Ditinjau'. Alur wajib: draft → sudah ditinjau → disetujui, dengan catatan peninjau yang ikut tercetak pada laporan."

### Tujuh keterbatasan yang dinyatakan di dalam produk

Halaman Metodologi merendernya dari endpoint yang sama dengan dokumennya, "sehingga tidak ada versi keterbatasan yang berbeda antara dokumen dan aplikasi":

1. Percakapan di X tidak mewakili seluruh populasi pencari kerja.
2. Sentimen otomatis dapat salah memahami slang, sarkasme, dan konteks lokal.
3. Volume percakapan bukan ukuran langsung kebutuhan tenaga kerja.
4. Engagement tinggi tidak selalu berarti informasi paling benar.
5. Data demo bersifat sintetis dan tidak boleh dibaca sebagai kondisi aktual.
6. Dashboard mendukung eksplorasi informasi, bukan keputusan rekrutmen individu.
7. Setiap insight harus diverifikasi manusia sebelum digunakan.

### Copywriting yang dilarang

"Kandidat negatif" · "Akun bermasalah" · "Pencari kerja berkualitas rendah" · klaim sebab-akibat tanpa analisis manusia · bahasa yang menyatakan hasil model pasti benar.

### Checklist sebelum data nyata — 8 butir, semuanya masih `[ ]`

Perjanjian & dasar hukum X API · kebijakan retensi · proses menghormati penghapusan post · ganti `JWT_SECRET` & password · nonaktifkan akun demo · **persetujuan penggunaan nama dan logo mitra** · peninjauan etika internal terhadap taxonomy · pembekalan pengguna dashboard.

---

## 9. Landasan teori

Perintah spec-nya bagus (`TalentPulse_Full_Project_Prompt.md:114`):

> "Teori harus terlihat dalam desain fitur, user flow, dan evaluasi. **Jangan hanya menuliskannya di halaman 'Tentang'.**"

Dan perintah itu dituruti — nama Ellis muncul di komentar kode, seed script, keputusan arsitektur, sampai UI produk (18 kemunculan).

### Model Perilaku Pencarian Informasi Ellis (1989)

Satu-satunya sitasi bertahun di seluruh produk (`metodologi/page.tsx:229` merender tag `Ellis (1989)`). Enam tahapnya dipetakan ke fitur di tiga tempat — spec §6.1, `docs/information_architecture.md` §5, dan **di dalam aplikasi** lewat konstanta `ELLIS_STAGES`:

| Tahap Ellis | Wujudnya di TalentPulse |
|---|---|
| **Starting** | Preset kata kunci per kategori isu di Pencarian Post (tabel `keyword_presets`, disunting admin) · preset topik & contoh query pada Ctrl+K — `shell.tsx:228`: "// Ctrl/Cmd+K membuka pencarian global (tahap 'Starting' pada model Ellis)"; `seed.py:43`: "# Preset query mendukung tahap 'Starting' pada model Ellis" |
| **Chaining** | Kata kunci/topik/pekerjaan yang dapat diklik — `analytics.py:355`: "dapat melakukan *chaining* (Ellis) menuju istilah bertetangga" |
| **Browsing** | Overview, grafik tren, kartu topik |
| **Differentiating** | Filter global + pengurutan relevansi/waktu/engagement |
| **Monitoring** | Monitoring & perbandingan periode — juga alasan filter disimpan di URL |
| **Extracting** | Detail post, catatan peninjau, ekspor laporan agregat |

Kalimat di UI (`metodologi/page.tsx:227`): "Model perilaku pencarian informasi Ellis dipakai sebagai kerangka alur pengguna, bukan sekadar rujukan teori."

### Information Foraging Theory

Lima konsep dipetakan ke desain (konstanta `FORAGING_CONCEPTS`): *information scent* · *information patch* · *cost of information* · *value of information* · perpindahan antar-patch. **Tanpa sitasi penulis** — Pirolli & Card nol hasil.

### Konsep pendukung yang disebut, tapi bukan teori utama

Information Retrieval (indexing, pencarian, filtering, ranking) · Information Architecture (organization, labeling, navigation, search system) · topic classification/modeling · sentiment analysis · interactive data visualization · human-in-the-loop. Semuanya tanpa sitasi.

### Nol hasil di seluruh repo

`Taylor` · `Saracevic` · `informetri` · `bibliometri` · `Shannon` · `Wilson` · `Dervin` · `Kuhlthau` · `Belkin` · `Morville` · `Rosenfeld` · `Shneiderman` · `Few` · `Dunn` · `kebijakan informasi` · `intermediary` · `perantara` · `temu balik` · `job matching`.

Tidak ada daftar pustaka, berkas `.bib`, atau satu pun sitasi bergaya akademik di repositori.

### Catatan penting: "job mismatch" tidak ada di produk ini

Grep untuk `mismatch` menghasilkan **nol** di source code dan dokumen (satu-satunya kemunculan adalah `data-testid="test-result-image-mismatch"` di dalam artefak build Playwright). Tidak ada fitur pencocokan kandidat–lowongan, tidak ada skor kecocokan, tidak ada perbandingan kualifikasi versus persyaratan — dan memang produk ini secara eksplisit menolak segala bentuk penilaian kandidat.

Yang ada adalah `job_role`: lima jenis pekerjaan naskah (SPG/SPB, Staf Gudang, Kasir, Administrasi, Pengemudi) ditambah `Lainnya`, diberikan `JobRoleTagger` berbasis frasa dan dipakai sebagai **facet filter dan sumbu agregasi** — pada filter global, heatmap "jenis pekerjaan × topik kekhawatiran", kartu partisi kategori isu × jenis pekerjaan di Eksplorasi Topik, stacked bar "sentimen per jenis pekerjaan", dan KPI "Jenis Pekerjaan Teratas".

Yang paling dekat secara konseptual adalah **kesenjangan informasi lowongan**: pencari kerja bertanya hal-hal yang seharusnya sudah dijawab iklan lowongan (gaji, kontrak, lokasi, shift, syarat pendidikan, proses melamar), dan dashboard mengubahnya jadi bahan FAQ. Ini tercermin di 10 topik taxonomy dan di 63,8% korpus berlabel "Pertanyaan". Tapi istilah "mismatch" tidak pernah dipakai dan tidak ada metrik yang mengukurnya.

---

## 10. Status build

Lima fase (Foundation → Core Exploration → Monitoring & Reporting → Quality → Production Readiness) semuanya diklaim selesai. README: "Seluruh fitur wajib MVP selesai dan dapat dijalankan dari clean setup."

### Pengujian — benar-benar dijalankan

Dilaporkan dijalankan 29 Agustus 2026, mode demo, dataset 1.400 post / 90 hari. Tabel di bawah adalah potret saat itu; jumlah terkini hanya dicatat di `docs/testing_report.md`.

| Lapisan | Perkakas | Jumlah | Hasil |
|---|---|---|---|
| Backend unit/integration | pytest 8.3.4 | **61** | lolos |
| Frontend unit/komponen | Vitest + Testing Library | **43** (7 berkas) | lolos |
| End-to-end | Playwright (Chromium) | **20 skenario** | lolos |
| Aksesibilitas | axe-core 4.13 (WCAG 2.1 A/AA) | 8 halaman + login + 5 uji manual | **nol pelanggaran** |
| Visual QA | Playwright, 4 ukuran layar | 4 × 8 halaman | lolos |
| Performa | benchmark in-process, 5.000 post | 11 endpoint | jauh di bawah 3 detik |
| Tipe | `tsc --noEmit` strict | – | tanpa error |
| Lint | ESLint | – | tanpa peringatan |

**Rincian backend:** `test_analytics.py` 15 (KPI, periode pembanding, pembagi nol, deteksi puncak, indeks tren, breakdown, skor perhatian) · `test_api.py` 31 (login & hierarki role, izin per endpoint, filter kombinasi, paginasi, alur insight & laporan, ekspor, validasi impor CSV, penarikan X API, metadata badge sintetis) · `test_search_and_nlp.py` 15 (parser query, pengurutan relevansi, normalisasi, klasifikasi, label "Tidak Yakin").

**Performa** (median 5 panggilan, 5.000 post / 180 hari, + jumlah query SQL untuk deteksi N+1): `/dashboard/overview` 134 ms (28 query) · `/dashboard/topics/{slug}` 80 ms (24) · `/dashboard/insight-suggestions` 58 ms (18) · `/monitors` 50 ms (20) · `/dashboard/topics` 47 ms (10) · `/dashboard/trends` 33 ms (10) · `/posts` 21 ms (7) · `/data/quality` 16 ms (9). Pada dataset bawaan 1.400 post, `/dashboard/overview` = 49 ms. "Tidak ditemukan pola N+1."

**14 bug ditemukan dan diperbaiki lewat pengujian**, antara lain: Overview meluber horizontal di 390px → `Card` diberi `min-w-0` · `router.replace` dipanggil dari updater state → dipindah ke `useEffect` · fokus terlempar keluar drawer → handler disimpan pada ref · teks berwarna gagal kontras WCAG AA → token `*-strong` · sel heatmap kontras 2,6:1 → skala warna berjenjang · ringkasan insight menyebut basa-basi ("halo semua", "numpang tanya") → stopword diperluas.

**Tangkapan layar:** 32 PNG (5,1 MB) di `docs/screenshots/` — 4 folder resolusi × 8 halaman. `1366x768` (laptop kantor, target utama) · `1920x1080` (monitor desktop) · `tablet-768` · `mobile-390`. Dihasilkan otomatis oleh `tests/e2e/visual-qa.spec.ts` sekaligus memeriksa `scrollWidth − clientWidth ≤ 1px`.

### Usability testing — BELUM DIJALANKAN

Ini temuan terpenting untuk keperluan TA. `docs/usability_test.md` adalah **skrip/protokol**, bukan laporan hasil. Bukti:

- `docs/testing_report.md` §6: "Pengujian dengan pengguna sungguhan (**dijadwalkan**; skrip siap di `docs/usability_test.md`)."
- Tabel `usability_events` berisi **0 baris**.

Protokolnya sendiri sudah lengkap dan siap pakai:

- **Peserta (target):** 5–8 orang dari Recruitment, HR, Recruitment Marketing, Employer Branding, atau Corporate Communication. Laptop kantor 1366×768 atau 1920×1080, Chrome/Edge.
- **Lima tugas:**
  1. (≤2 menit) "Temukan tiga topik yang paling banyak dibicarakan mengenai pekerjaan **staf gudang** selama 30 hari terakhir."
  2. (≤3 menit) "Temukan pertanyaan yang paling sering muncul mengenai **sistem shift**, lalu buka tiga post yang mewakili."
  3. (≤3 menit) "Bandingkan sentimen percakapan mengenai pekerjaan **admin** dan **sales promotion**."
  4. (≤3 menit) "Simpan monitoring untuk **penipuan lowongan**, lalu bandingkan dua periode."
  5. (≤5 menit) "Buat laporan insight yang memuat dua grafik dan tiga temuan."
- **Tujuh metrik:** task success rate · time on task · error count · navigation steps · filter usage (nama filter saja, **nilainya tidak dicatat**) · SUS 10 pernyataan · search relevance (5 hasil teratas pada Tugas 2)
- **Ambang keberhasilan:** task success rate **≥80%** tanpa bantuan untuk Tugas 1–4 · SUS **≥68** · search relevance **≥3 dari 5** · kesadaran data sintetis **100%** peserta
- **Instrumentasi:** `POST /usability/events` hanya menyimpan `session_key` anonim, `task_code`, `event_type`, `step_count`, `duration_ms`, `filter_keys` — "Isi pencarian, teks post, dan credential tidak pernah dikirim."

> **Jangan sampai tertukar.** Playwright mensimulasikan Tugas 1–5 dengan durasi 7,2 · 4,8 · 1,9 · 3,3 · 4,1 detik. Itu **robot mengeksekusi jalur ideal**, bukan manusia mencari jalan. Angka ini tidak boleh masuk Bab IV sebagai *time on task* peserta.

### Yang belum ada

1. Usability testing dengan pengguna nyata — hanya skrip
2. Validasi masalah lewat wawancara mitra — masih "hipotesis"
3. Tujuh fitur lanjutan pasca-MVP
4. Mode live X API — belum pernah dijalankan
5. Jalur PostgreSQL FTS belum diuji otomatis (hanya manual via `docker compose`)
6. Isi visual PDF ekspor belum diverifikasi (hanya status HTTP dan tipe konten)
7. Delapan butir checklist etika pra-data-nyata
8. Insight (0), report (0), audit_log (0) — fiturnya jalan dan teruji, belum ada yang dibuat

---

## 11. Inkonsistensi yang perlu dirapikan

**A. Angka tes bertentangan di dalam berkas yang sama.** README menulis "61 pengujian pytest lolos" dan "43 pengujian Vitest lolos" di tabel Status, tapi "58 pengujian" dan "38 pengujian" di bagian Pengujian. `docs/testing_report.md` memberi judul "Frontend (38 pengujian)" padahal tabelnya menjumlah 43 dan blok kodenya sendiri menampilkan "Tests 43 passed". **Hitungan aktual: 61 dan 43.** Angka 58/38 sisa versi lama.

**B. CLAUDE.md menyatakan repo belum pernah di-commit.** Isinya masih menulis "Belum ada commit sama sekali — semua masih untracked di branch `master`" dan "Repositori belum pernah di-commit — tanyakan dulu ke pemilik sebelum membuat commit pertama." Faktanya commit `d6881f6` sudah ada (1 Sep 2026) di branch **`main`**, dengan remote GitHub.

**C. `pandas` dan `scikit-learn` dipin tapi tidak pernah diimpor.** Keduanya ada di `requirements.txt` (spec §15 memang memintanya), tapi grep `import pandas|sklearn` di `apps/api` = nol hasil. Pipeline NLP sepenuhnya leksikon/regex. Ini menggelembungkan image Docker dan mengundang pertanyaan penguji "mana machine learning-nya?" — padahal jawabannya bagus: baseline sengaja dipilih agar dapat dijelaskan dan dikoreksi manusia. Lebih baik copot paketnya dan jelaskan alasannya.

**D. `@tanstack/react-table` dan `zod` juga tidak dipakai.** Ada di `package.json`, nol impor di `src`. Tabel dibangun manual, validasi form manual.

**E. shadcn/ui tidak dipakai** — dipakai komponen kustom `components/ui.tsx`. Masih memenuhi klausul spec "atau komponen aksesibel setara", tapi perlu dijelaskan bila ditanya.

**F. Data demo berhenti 31 Agustus 2026** sementara sekarang sudah September. Jendela default 30 hari akan memperlihatkan hari-hari kosong di ujung dan badge "data mungkin belum terbarui" bisa muncul. Jalankan `python -m app.seed --reset` sebelum demo atau sidang.

**G. Basis data lokal tidak ter-stamp Alembic.** `alembic_version` berisi 0 baris — DB dibuat lewat `create_all` saat startup, bukan `alembic upgrade head`. Konsekuensinya migrasi belum pernah teruji pada DB ini.

**H. Dokumen bertanggal lebih tua dari kode.** `docs/testing_report.md` dan `CLAUDE.md` keduanya menulis "29 Agustus 2026", sementara commit-nya 1 September dan berkas terakhir diubah 4 September. Hasil tes yang dilaporkan berasal dari kondisi 29 Agustus.

**I. Working tree tampak kotor, padahal bersih.** `git status --short` melaporkan 50 berkas modified, tapi `git diff --stat` menunjukkan insertions dan deletions **persis sama** (22.015 masing-masing) dan `--ignore-cr-at-eol` menghasilkan output kosong. Itu murni perubahan akhiran baris CRLF/LF. Secara konten identik dengan commit.

**J. Landasan teori tipis untuk TA Sains Informasi.** Hanya Ellis (dengan tahun) dan Information Foraging (tanpa penulis). Tidak ada Taylor, Belkin, Kuhlthau, Dervin, Wilson, Saracevic, atau Rosenfeld & Morville — padahal produk secara operasional menyentuh relevance ranking, arsitektur informasi (organisasi, pelabelan, navigasi, pencarian), dan perilaku pencarian informasi.

**K. `.env` identik dengan `.env.example`,** termasuk `JWT_SECRET=dev-only-insecure-secret-change-me`. Aman karena `.gitignore` mengecualikan `.env`, dan tidak ada secret asli yang bocor (token X API kosong) — tapi jelas nilai development.

**L. Klaim "ringkasan usability" di halaman Metodologi akan menampilkan empty state,** karena `usability_events` kosong. README dan `docs/features.md` mencantumkannya sebagai isi halaman.
